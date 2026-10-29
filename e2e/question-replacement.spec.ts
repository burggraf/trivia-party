import { expect, test, type Page } from '@playwright/test'

const hostId = 'replacehost0001'
const gameId = 'replacegame0001'
const rounds = [
  { id: 'replaceround001', title: 'Science', sequence_number: 1, question_count: 3 },
  { id: 'replaceround002', title: 'History', sequence_number: 2, question_count: 1 },
].map(round => ({ ...round, host: hostId, game: gameId }))
const questions = Array.from({ length: 6 }, (_, index) => ({
  id: `replacequest00${index}`, question: `Original question ${index + 1}?`,
  category: 'General knowledge', subcategory: 'Trivia', difficulty: 'easy', level: 2,
  answer_a: `Correct ${index + 1}`, answer_b: 'Alternative B', answer_c: 'Alternative C', answer_d: 'Alternative D',
}))
const replacement = { ...questions[4], question: 'Replacement question?', answer_a: 'Replacement answer' }

async function setup(page: Page) {
  const state = {
    writes: [] as { method: string; data: Record<string, unknown> }[],
    randomFilters: [] as string[],
    minLevel: 0, maxLevel: 9, currentLevel: 2, replacementLevel: 2,
    failCreate: false, failRetire: false, noCandidates: false, failLevels: false,
    records: questions.slice(0, 4).map((question, index) => ({
      id: `replacejoin00${index}`, host: hostId, game: gameId,
      round: rounds[index < 3 ? 0 : 1].id, sequence: index < 3 ? index + 1 : 1,
      question: question.id, category_name: question.category, key: `original-shuffle-${index}`,
    })),
  }
  const game = { id: gameId, host: hostId, name: 'Replacement Test', code: 'REPL01', status: 'ready', metadata: {}, data: {}, scoreboard: {} }
  await page.addInitScript(hostId => {
    const token = `test.${btoa(JSON.stringify({ exp: 4102444800, id: hostId }))}.test`
    localStorage.setItem('pocketbase_auth', JSON.stringify({ token, record: { id: hostId, collectionName: 'users', role: 'host' } }))
    localStorage.setItem('controller.playMode', 'host-only')
  }, hostId)
  await page.route('**/api/**', async route => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname
    const list = (items: unknown[]) => route.fulfill({ json: { page: 1, perPage: 500, totalItems: items.length, totalPages: 1, items } })
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204 })
    if (path === '/api/health') return route.fulfill({ json: { code: 200, message: 'Healthy' } })
    if (path.includes('/games/records')) {
      if (request.method() === 'PATCH') Object.assign(game, request.postDataJSON())
      return path.endsWith('/records') ? list([game]) : route.fulfill({ json: game })
    }
    if (path.includes('/rounds/records')) {
      return path.endsWith('/records') ? list(rounds) : route.fulfill({ json: rounds.find(round => path.endsWith(round.id)) })
    }
    if (path.includes('/questions/records')) {
      if (!path.endsWith('/records')) {
        const question = [...questions, replacement].reverse().find(question => path.endsWith(question.id))
        return route.fulfill({ json: { ...question, level: question?.id === questions[0].id ? state.currentLevel : question?.id === replacement.id ? state.replacementLevel : question?.level } })
      }
      const sort = url.searchParams.get('sort')
      if (sort === 'level' || sort === '-level') {
        if (state.failLevels) return route.fulfill({ status: 500, json: { message: 'Unable to load levels' } })
        return list([{ ...questions[0], level: sort === 'level' ? state.minLevel : state.maxLevel }])
      }
      const filter = url.searchParams.get('filter') || ''
      state.randomFilters.push(filter)
      const selected = [...filter.matchAll(/level\s*=\s*(-?\d+)/g)].map(match => Number(match[1]))
      state.replacementLevel = selected.includes(7) ? 7 : selected[0]
      return list(state.noCandidates ? [] : [{ ...replacement, level: state.replacementLevel }])
    }
    if (path.includes('/game_questions/records')) {
      if (request.method() !== 'GET') {
        const data = request.method() === 'DELETE' ? {} : request.postDataJSON()
        state.writes.push({ method: request.method(), data })
        if (request.method() === 'POST') {
          if (state.failCreate) return route.fulfill({ status: 500, json: { message: 'Creation failed' } })
          const record = { ...state.records[0], ...data, id: 'replacementjoin', key: 'replacement-shuffle' }
          state.records.push(record)
          return route.fulfill({ json: record })
        }
        const index = state.records.findIndex(record => path.endsWith(record.id))
        if (request.method() === 'DELETE') {
          state.records.splice(index, 1)
          return route.fulfill({ status: 204 })
        }
        if (state.failRetire) return route.fulfill({ status: 500, json: { message: 'Update failed' } })
        Object.assign(state.records[index], data)
        return route.fulfill({ json: state.records[index] })
      }
      const filter = url.searchParams.get('filter') || ''
      const round = rounds.find(round => filter.includes(round.id))
      return list(state.records.filter(record => !round || record.round === round.id).map(record => ({
        ...record, expand: { question: record.question === replacement.id ? { ...replacement, level: state.replacementLevel } : { ...questions.find(question => question.id === record.question), level: state.currentLevel } },
      })))
    }
    if (path.endsWith('/records')) return list([])
    return route.fulfill({ status: 404, json: { message: 'Not found' } })
  })
  return state
}

async function openGamesQuestions(page: Page) {
  await page.goto('/host')
  await expect(page.getByText('Replacement Test', { exact: true })).toBeVisible()
  await page.locator('[data-radix-collection-item][aria-controls]').first().click()
  await expect(page.getByText('Science', { exact: true })).toBeVisible()
  await page.locator('[data-radix-collection-item][aria-controls]').nth(1).click()
  await expect(page.getByText(questions[0].question, { exact: true })).toBeVisible()
}

const replaceButton = (page: Page) => page.getByRole('button', { name: 'Replace with a new question', exact: true })
const dialog = (page: Page) => page.getByRole('dialog', { name: 'Replace question?', exact: true })

test('Games uses edge-to-edge outer content on phones while retaining the desktop frame', async ({ page }, testInfo) => {
  await setup(page)
  await openGamesQuestions(page)
  const frame = page.getByRole('heading', { name: 'Games', exact: true }).locator('../..')
  for (const theme of ['Light', 'Dark']) {
    await page.getByRole('button', { name: /Current theme:/ }).click()
    await page.getByRole('menuitem', { name: theme, exact: true }).click()
    for (const width of [375, 390, 430, 1024]) {
      await page.setViewportSize({ width, height: 800 })
      await expect(frame).toHaveCSS('border-left-width', width < 768 ? '0px' : '1px')
      await expect(frame.locator('..')).toHaveCSS('padding-left', width < 768 ? '0px' : '48px')
      if (width < 768) {
        const box = (await frame.boundingBox())!
        expect(box.x).toBe(0)
        expect(box.width).toBe(width)
      }
      if (width === 375) await page.screenshot({ path: testInfo.outputPath(`games-${theme.toLowerCase()}.png`), fullPage: true })
    }
  }
})

test('games replacement requires confirmation, defaults to the current level, and supports nonconsecutive levels', async ({ page }, testInfo) => {
  const state = await setup(page)
  await openGamesQuestions(page)
  await replaceButton(page).first().click()
  await expect(dialog(page)).toBeVisible()
  const levels = dialog(page).getByRole('group', { name: 'Difficulty levels' })
  await expect(levels.getByRole('button')).toHaveCount(10)
  await expect(levels.getByRole('button', { name: 'Level 0', exact: true })).toHaveAttribute('aria-pressed', 'false')
  await expect(levels.getByRole('button', { name: 'Level 2', exact: true })).toHaveAttribute('aria-pressed', 'true')
  expect(state.writes).toEqual([])
  await dialog(page).getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(dialog(page)).not.toBeVisible()
  expect(state.writes).toEqual([])
  await replaceButton(page).first().click()
  await dialog(page).getByRole('button', { name: 'Level 2', exact: true }).click()
  await expect(dialog(page).getByRole('button', { name: 'Replace Question', exact: true })).toBeDisabled()
  await dialog(page).getByRole('button', { name: 'Level 2', exact: true }).click()
  await dialog(page).getByRole('button', { name: 'Level 7', exact: true }).click()
  await expect(dialog(page).getByRole('button', { name: 'Level 2', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(dialog(page).getByRole('button', { name: 'Level 7', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.screenshot({ path: testInfo.outputPath('replacement-dialog.png'), animations: 'disabled' })
  await dialog(page).getByRole('button', { name: 'Replace Question', exact: true }).click()
  await expect(dialog(page)).not.toBeVisible()
  await expect(page.getByText(replacement.question, { exact: true })).toBeVisible()
  expect(state.randomFilters[0]).toMatch(/level\s*=\s*2/)
  expect(state.randomFilters[0]).toMatch(/level\s*=\s*7/)
  expect(state.randomFilters[0]).toContain('||')
  expect(state.randomFilters[0]).not.toMatch(/level\s*[<>]/)
  expect(state.randomFilters[0]).toMatch(/id\s*!=/)
  expect(state.randomFilters[0]).toContain(questions[0].id)
  expect(state.records.filter(record => record.round === rounds[0].id)).toHaveLength(3)
  expect(state.records.find(record => record.id === 'replacejoin000')?.round).toBe('')
})

test('level zero is displayed and preselected using the actual question-bank range', async ({ page }) => {
  const state = await setup(page)
  state.currentLevel = 0
  state.maxLevel = 4
  await openGamesQuestions(page)
  await expect(page.getByText('easy 0', { exact: true })).toBeVisible()
  await replaceButton(page).first().click()
  await expect(dialog(page).getByRole('group', { name: 'Difficulty levels' }).getByRole('button')).toHaveCount(5)
  await expect(dialog(page).getByRole('button', { name: 'Level 0', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await dialog(page).getByRole('button', { name: 'Cancel', exact: true }).click()
  await page.goto(`/controller/${gameId}`)
  await expect(page.getByText('easy 0', { exact: true })).toBeVisible()
  await replaceButton(page).click()
  await expect(dialog(page).getByRole('button', { name: 'Level 0', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await dialog(page).getByRole('button', { name: 'Replace Question', exact: true }).click()
  await expect(dialog(page)).not.toBeVisible()
  expect(state.randomFilters[0]).toMatch(/level\s*=\s*0/)
})

test('replacement prevents duplicate confirmation or dismissal while saving', async ({ page }) => {
  const state = await setup(page)
  let release!: () => void
  const blocked = new Promise<void>(resolve => { release = resolve })
  await page.route('**/game_questions/records', async route => {
    if (route.request().method() === 'POST') await blocked
    await route.fallback()
  })
  await page.goto(`/controller/${gameId}`)
  await replaceButton(page).click()
  await dialog(page).getByRole('button', { name: 'Replace Question', exact: true }).click()
  try {
    await expect(dialog(page).getByRole('button', { name: 'Replacing…', exact: true })).toBeDisabled()
    await expect(dialog(page).getByRole('button', { name: 'Cancel', exact: true })).toBeDisabled()
    await expect(dialog(page).getByRole('button', { name: 'Level 2', exact: true })).toBeDisabled()
    await dialog(page).getByRole('button', { name: 'Close', exact: true }).click()
    await expect(dialog(page)).toBeVisible()
  } finally {
    release()
  }
  await expect(dialog(page)).not.toBeVisible()
  expect(state.writes.filter(write => write.method === 'POST')).toHaveLength(1)
})

test('Host Only replacement updates the displayed question and its revealed answer', async ({ page }) => {
  const state = await setup(page)
  await page.goto(`/controller/${gameId}`)
  await replaceButton(page).click()
  await dialog(page).getByRole('button', { name: 'Replace Question', exact: true }).click()
  await expect(page.getByText(replacement.question, { exact: true })).toBeVisible()
  await expect(page.getByRole('img', { name: 'Correct answer', exact: true })).toHaveCount(0)
  await expect(replaceButton(page)).toBeVisible()
  expect(state.records.filter(record => record.round === rounds[0].id)).toHaveLength(3)
  await page.getByRole('button', { name: 'Next Question', exact: true }).click()
  await page.getByRole('button', { name: 'Next Question', exact: true }).click()
  await page.getByRole('button', { name: 'Reveal Answers', exact: true }).click()
  await expect(page.getByText(/^[ABCD]\. Replacement answer$/)).toHaveClass(/bg-green-100/)
  await expect(replaceButton(page)).toHaveCount(0)
})

test('Host Only never offers replacement again after leaving a question in either direction', async ({ page }) => {
  await setup(page)
  await page.goto(`/controller/${gameId}`)
  await expect(replaceButton(page)).toBeVisible()
  await page.getByRole('button', { name: 'Next Question', exact: true }).click()
  await expect(replaceButton(page)).toBeVisible()
  await page.getByRole('button', { name: 'Previous Question', exact: true }).click()
  await expect(replaceButton(page)).toHaveCount(0)
  await page.getByRole('button', { name: 'Next Question', exact: true }).click()
  await expect(replaceButton(page)).toHaveCount(0)
  await page.getByRole('button', { name: 'Jump to question', exact: true }).click()
  await page.getByRole('dialog', { name: 'Jump to question', exact: true }).getByRole('button', { name: '1', exact: true }).click()
  await expect(replaceButton(page)).toHaveCount(0)
  await page.getByRole('button', { name: 'Next Question', exact: true }).click()
  await page.getByRole('button', { name: 'Next Question', exact: true }).click()
  await expect(replaceButton(page)).toBeVisible()
  await page.getByRole('button', { name: 'Reveal Answers', exact: true }).click()
  await expect(replaceButton(page)).toHaveCount(0)
  await page.getByRole('button', { name: 'Next Round', exact: true }).click()
  await expect(replaceButton(page)).toBeVisible()
  await page.getByRole('button', { name: 'Jump to round', exact: true }).click()
  await page.getByRole('dialog', { name: 'Jump to round', exact: true }).getByRole('button', { name: '1', exact: true }).click()
  await expect(replaceButton(page)).toHaveCount(0)
  await page.getByRole('button', { name: 'Jump to round', exact: true }).click()
  await page.getByRole('dialog', { name: 'Jump to round', exact: true }).getByRole('button', { name: '2', exact: true }).click()
  await expect(replaceButton(page)).toHaveCount(0)
})

for (const failure of ['noCandidates', 'failCreate', 'failRetire'] as const) {
  test(`replacement preserves the original question on ${failure} and permits retry`, async ({ page }) => {
    const state = await setup(page)
    state[failure] = true
    await page.goto(`/controller/${gameId}`)
    await replaceButton(page).click()
    await dialog(page).getByRole('button', { name: 'Replace Question', exact: true }).click()
    await expect(dialog(page).getByRole('alert')).toBeVisible()
    expect(state.records.filter(record => record.round === rounds[0].id)).toHaveLength(3)
    expect(state.records.find(record => record.id === 'replacejoin000')?.question).toBe(questions[0].id)
    expect(state.records.find(record => record.id === 'replacejoin000')?.round).toBe(rounds[0].id)
    state[failure] = false
    await dialog(page).getByRole('button', { name: 'Replace Question', exact: true }).click()
    await expect(dialog(page)).not.toBeVisible()
    await expect(page.getByText(replacement.question, { exact: true })).toBeVisible()
  })
}

test('difficulty range load failure cannot trigger replacement and can be retried', async ({ page }) => {
  const state = await setup(page)
  state.failLevels = true
  await page.goto(`/controller/${gameId}`)
  await replaceButton(page).click()
  await expect(dialog(page).getByRole('alert')).toBeVisible()
  await expect(dialog(page).getByRole('button', { name: 'Replace Question', exact: true })).toBeDisabled()
  expect(state.writes).toEqual([])
  state.failLevels = false
  await dialog(page).getByRole('button', { name: 'Retry', exact: true }).click()
  await expect(dialog(page).getByRole('button', { name: 'Level 2', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(dialog(page).getByRole('button', { name: 'Replace Question', exact: true })).toBeEnabled()
})
