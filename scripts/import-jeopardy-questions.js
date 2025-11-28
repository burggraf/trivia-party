#!/usr/bin/env node

/**
 * Efficient questions import script for Jeopardy questions database
 * Uses sqlite3 CLI for compatibility (no native module required)
 */

import { execSync, spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const SOURCE_DB_PATH = path.join(__dirname, '../questions.db')
const DEST_DB_PATH = path.join(__dirname, '../pb_data/data.db')
const BATCH_SIZE = 5000

/**
 * Generate a PocketBase-style ID
 */
function generatePocketBaseId() {
	const bytes = new Uint8Array(7)
	crypto.getRandomValues(bytes)
	return 'r' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Execute a sqlite3 query and return JSON results
 */
function querySourceDb(sql) {
	const result = execSync(`sqlite3 -json "${SOURCE_DB_PATH}" "${sql.replace(/"/g, '\\"')}"`, {
		maxBuffer: 100 * 1024 * 1024, // 100MB buffer for large results
		encoding: 'utf-8'
	})
	return result.trim() ? JSON.parse(result) : []
}

/**
 * Execute a sqlite3 query on destination db
 */
function execDestDb(sql) {
	execSync(`sqlite3 "${DEST_DB_PATH}" "${sql.replace(/"/g, '\\"')}"`, {
		maxBuffer: 10 * 1024 * 1024
	})
}

/**
 * Escape string for SQLite
 */
function escapeStr(str) {
	if (str === null || str === undefined) return ''
	return String(str).replace(/'/g, "''")
}

/**
 * Main import function
 */
async function main() {
	console.log('🚀 Starting Jeopardy questions import...')
	console.log(`📂 Source: ${SOURCE_DB_PATH}`)
	console.log(`📂 Destination: ${DEST_DB_PATH}`)

	// Get count of questions to import
	const countResult = querySourceDb('SELECT COUNT(*) as count FROM questions')
	const totalCount = countResult[0].count
	console.log(`📊 Found ${totalCount.toLocaleString()} questions in source database`)

	// Get existing external_ids to prevent duplicates
	console.log('🔍 Checking for existing questions...')
	let existingIds = new Set()
	try {
		const existingResult = execSync(
			`sqlite3 -json "${DEST_DB_PATH}" "SELECT external_id FROM questions WHERE external_id != ''"`,
			{ maxBuffer: 50 * 1024 * 1024, encoding: 'utf-8' }
		)
		if (existingResult.trim()) {
			const existing = JSON.parse(existingResult)
			existing.forEach(row => existingIds.add(row.external_id))
		}
	} catch (e) {
		console.log('   No existing questions found or error fetching them')
	}
	console.log(`📋 Found ${existingIds.size.toLocaleString()} existing questions in destination`)

	// Process in batches
	let offset = 0
	let successCount = 0
	let skippedCount = 0
	let errorCount = 0
	const importedAt = new Date().toISOString()

	console.log('📥 Starting import...')
	const startTime = Date.now()

	while (offset < totalCount) {
		// Fetch batch from source
		const rows = querySourceDb(`
			SELECT
				id, category, difficulty, level, question,
				a, b, c, d, air_date, original_question,
				original_answer, metadata
			FROM questions
			LIMIT ${BATCH_SIZE} OFFSET ${offset}
		`)

		if (rows.length === 0) break

		// Build batch insert SQL
		const values = []

		for (const row of rows) {
			// Skip if already exists or incomplete
			if (!row.id || existingIds.has(row.id)) {
				skippedCount++
				continue
			}
			if (!row.question || !row.a || !row.b || !row.c || !row.d) {
				skippedCount++
				continue
			}

			// Build metadata JSON
			const metadataObj = {}
			if (row.air_date) metadataObj.air_date = row.air_date
			if (row.original_question) metadataObj.original_question = row.original_question
			if (row.original_answer) metadataObj.original_answer = row.original_answer
			if (row.metadata) {
				try {
					Object.assign(metadataObj, JSON.parse(row.metadata))
				} catch {
					metadataObj.raw_metadata = row.metadata
				}
			}
			const metadataStr = Object.keys(metadataObj).length > 0
				? JSON.stringify(metadataObj)
				: ''

			values.push(`(
				'${generatePocketBaseId()}',
				'${escapeStr(row.id)}',
				'${escapeStr(row.category)}',
				'',
				'${escapeStr(row.difficulty || 'medium')}',
				'${escapeStr(row.question)}',
				'${escapeStr(row.a)}',
				'${escapeStr(row.b)}',
				'${escapeStr(row.c)}',
				'${escapeStr(row.d)}',
				${row.level || 0},
				'${importedAt}',
				'${escapeStr(metadataStr)}'
			)`)

			// Add to seen set
			existingIds.add(row.id)
		}

		if (values.length > 0) {
			// Write SQL to temp file to handle large inserts
			const sql = `INSERT INTO questions (
				id, external_id, category, subcategory, difficulty,
				question, answer_a, answer_b, answer_c, answer_d,
				level, imported_at, metadata
			) VALUES ${values.join(',\n')};`

			const tmpFile = `/tmp/import_batch_${Date.now()}.sql`
			fs.writeFileSync(tmpFile, sql)

			try {
				execSync(`sqlite3 "${DEST_DB_PATH}" ".read ${tmpFile}"`, {
					maxBuffer: 100 * 1024 * 1024
				})
				successCount += values.length
			} catch (e) {
				errorCount += values.length
				if (errorCount <= 5) {
					console.error(`\n  ✗ Batch error: ${e.message}`)
				}
			}

			fs.unlinkSync(tmpFile)
		}

		offset += BATCH_SIZE

		// Progress indicator
		const progress = Math.min(100, Math.round((offset / totalCount) * 100))
		const elapsed = (Date.now() - startTime) / 1000
		const rate = Math.round(successCount / (elapsed || 1))
		process.stdout.write(`\r  ✓ Progress: ${progress}% | Imported: ${successCount.toLocaleString()} | Rate: ${rate}/sec    `)
	}

	const totalTime = ((Date.now() - startTime) / 1000).toFixed(1)
	console.log(`\n\n✅ Import complete in ${totalTime}s!`)
	console.log(`   Successfully imported: ${successCount.toLocaleString()} questions`)
	console.log(`   Skipped (duplicates/incomplete): ${skippedCount.toLocaleString()} questions`)
	if (errorCount > 0) {
		console.log(`   Errors: ${errorCount}`)
	}

	// Show final count
	const finalResult = querySourceDb(`SELECT 1`) // just to verify db access
	const finalCount = execSync(
		`sqlite3 "${DEST_DB_PATH}" "SELECT COUNT(*) FROM questions"`,
		{ encoding: 'utf-8' }
	).trim()
	console.log(`\n📊 Total questions in database: ${parseInt(finalCount).toLocaleString()}`)
}

main().catch(err => {
	console.error(`\n❌ Error: ${err.message}`)
	process.exit(1)
})
