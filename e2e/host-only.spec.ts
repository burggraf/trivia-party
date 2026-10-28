import { expect, test, Page } from '@playwright/test'

const hostId = 'hostonlytest001'
const gameId = 'hostonlygame001'
const rounds = [
  { id: 'hostonlyround01', title: 'Science', sequence_number: 1, question_count: 3 },
  { id: 'hostonlyround02', title: 'History', sequence_number: 2, question_count: 1 },
].map(round => ({ ...round, host: hostId, game: gameId }))
const questions = [
  { id: 'hostonlyquest01', question: 'Which planet is known as the Red Planet?', answer_a: 'Mars' },
  { id: 'hostonlyquest02', question: 'Which gas do plants absorb?', answer_a: 'Carbon dioxide' },
  { id: 'hostonlyquest03', question: 'What is the largest ocean?', answer_a: 'Pacific' },
  { id: 'hostonlyquest04', question: 'Who was the first US president?', answer_a: 'George Washington' },
].map(question => ({
  ...question, category: 'General knowledge', subcategory: 'Trivia', difficulty: 'easy', level: '2',
  answer_b: 'Alternative B', answer_c: 'Alternative C', answer_d: 'Alternative D',
}))

async function setup(page: Page, mode?: string) {
  const updates: Record<string, unknown>[] = []
  const game = {
    id: gameId, host: hostId, name: 'Host Only Test', code: 'HOST01', status: 'ready',
    data: { state: 'game-start' }, scoreboard: { teams: {} },
    metadata: { question_timer: 1, round_start_timer: 1 },
  }
  await page.addInitScript(({ hostId, mode }) => {
    const token = `test.${btoa(JSON.stringify({ exp: 4102444800, id: hostId }))}.test`
    localStorage.setItem('pocketbase_auth', JSON.stringify({ token, record: { id: hostId, collectionName: 'users', role: 'host' } }))
    if (mode) localStorage.setItem('controller.playMode', mode)
  }, { hostId, mode })
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url())
    const path = url.pathname
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204 })
    if (path === '/api/health') return route.fulfill({ json: { code: 200, message: 'Healthy' } })
    if (path.endsWith(`/games/records/${gameId}`) || path.endsWith('/games/records/nextgame0000001')) {
      if (route.request().method() === 'PATCH') {
        const update = route.request().postDataJSON()
        updates.push(update)
        Object.assign(game, update)
      }
      return route.fulfill({ json: { ...game, id: path.split('/').pop() } })
    }
    if (path.endsWith('/records')) {
      let items: unknown[] = []
      if (path.includes('/rounds/')) items = rounds
      if (path.includes('/game_questions/')) {
        const isSecondRound = url.searchParams.get('filter')?.includes(rounds[1].id)
        items = (isSecondRound ? questions.slice(3) : questions.slice(0, 3)).map((question, index) => ({
          id: `gamequestion${index}`, host: hostId, game: gameId,
          round: rounds[isSecondRound ? 1 : 0].id, question: question.id,
          sequence: index + 1, category_name: question.category, key: `shuffle-key-${index}`,
          expand: { question },
        }))
      }
      return route.fulfill({ json: { page: 1, perPage: 200, totalItems: items.length, totalPages: 1, items } })
    }
    return route.fulfill({ status: 404, json: { message: 'Not found' } })
  })
  return updates
}

async function selectMode(page: Page, name: 'Player' | 'Host Only') {
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await page.getByRole('menuitemradio', { name, exact: true }).click()
}

test('defaults to Player and remembers exactly one mode across games', async ({ page }) => {
  await setup(page)
  await page.goto(`/controller/${gameId}`)
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await expect(page.getByRole('menuitemradio', { name: 'Player', exact: true })).toBeChecked()
  await expect(page.getByRole('menuitemradio', { name: 'Host Only', exact: true })).not.toBeChecked()
  await page.getByRole('menuitemradio', { name: 'Host Only', exact: true }).click()
  await expect(page.getByText('Question 1 of 3', { exact: true })).toBeVisible()
  await page.goto('/controller/nextgame0000001')
  await expect(page.getByText('Question 1 of 3', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await expect(page.getByRole('menuitemradio', { name: 'Host Only', exact: true })).toBeChecked()
  await expect(page.getByRole('menuitemradio', { name: 'Player', exact: true })).not.toBeChecked()
  await page.keyboard.press('Escape')
  await selectMode(page, 'Player')
  await expect(page.getByText('Question 1 of 3', { exact: true })).not.toBeVisible()
  await expect(page.getByText('Display Management', { exact: true })).toBeVisible()
  await page.reload()
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await expect(page.getByRole('menuitemradio', { name: 'Player', exact: true })).toBeChecked()
})

test('navigates questions without revealing answers, reviews each round, and completes the game', async ({ page }) => {
  const updates = await setup(page, 'host-only')
  await page.goto(`/controller/${gameId}`)
  await expect(page.getByText('Round 1 of 2', { exact: true })).toBeVisible()
  await expect(page.getByText('Question 1 of 3', { exact: true })).toBeVisible()
  await expect(page.getByText(questions[0].question, { exact: true })).toBeVisible()
  await expect(page.getByText('Correct answer:', { exact: false })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Previous Question' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Reveal Answers', exact: true })).toHaveCount(0)
  await expect(page.getByText('Display Management', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Next Question Preview', { exact: true })).toHaveCount(0)
  // Player timers must not advance or reveal the host's question.
  await page.clock.install()
  await page.clock.fastForward(5000)
  await expect(page.getByText('Question 1 of 3', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Next Question', exact: true }).click()
  await expect(page.getByText(questions[1].question, { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Previous Question' }).click()
  await expect(page.getByText(questions[0].question, { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Jump to question', exact: true }).click()
  const picker = page.getByRole('dialog', { name: 'Jump to question', exact: true })
  await expect(picker.getByRole('button', { name: '1', exact: true })).toBeDisabled()
  await expect(picker.getByRole('button', { name: '1', exact: true })).toHaveAttribute('aria-current', 'step')
  await expect(picker.getByRole('group', { name: 'Question numbers' }).getByRole('button')).toHaveCount(3)
  await expect(picker.getByRole('button', { name: '3', exact: true })).toBeDisabled()
  await expect(picker.getByRole('button', { name: '2', exact: true })).toBeEnabled()
  await picker.getByRole('button', { name: '2', exact: true }).click()
  await expect(picker).not.toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Jump to question' })).toHaveCount(0)
  await expect(page.getByText(questions[1].question, { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Next Question', exact: true }).click()
  await expect(page.getByText(questions[2].question, { exact: true })).toBeVisible()
  await expect(page.getByText('Correct answer:', { exact: false })).toHaveCount(0)
  await page.getByRole('button', { name: 'Reveal Answers', exact: true }).click()
  for (const question of questions.slice(0, 3)) {
    await expect(page.getByText(question.question, { exact: true })).toBeVisible()
    await expect(page.getByText(new RegExp(`Correct answer: [ABCD]\\. ${question.answer_a}`))).toBeVisible()
  }
  await page.getByRole('button', { name: 'Next Round', exact: true }).click()
  await expect(page.getByText('Round 2 of 2', { exact: true })).toBeVisible()
  await expect(page.getByText('Question 1 of 1', { exact: true })).toBeVisible()
  await expect(page.getByText(questions[3].question, { exact: true })).toBeVisible()
  await expect(page.getByText('Correct answer:', { exact: false })).toHaveCount(0)
  await page.getByRole('button', { name: 'Reveal Answers', exact: true }).click()
  await expect(page.getByText(/Correct answer: [ABCD]\. George Washington/)).toBeVisible()
  const completed = page.waitForRequest(request => request.method() === 'PATCH' && request.postDataJSON()?.status === 'completed')
  await page.getByRole('button', { name: 'Game Complete', exact: true }).click()
  await completed
  await expect(page).toHaveURL(/\/host$/)
  expect(updates.some(update => update.status === 'in-progress')).toBeTruthy()
  expect(updates.some(update => 'data' in update || 'scoreboard' in update)).toBeFalsy()
})

test('jumps between rounds and starts each selected round with hidden answers', async ({ page }) => {
  await setup(page, 'host-only')
  await page.goto(`/controller/${gameId}`)
  await page.getByRole('button', { name: 'Next Question', exact: true }).click()
  await page.getByRole('button', { name: 'Jump to round', exact: true }).click()
  const picker = page.getByRole('dialog', { name: 'Jump to round', exact: true })
  await expect(picker.getByRole('group', { name: 'Round numbers' }).getByRole('button')).toHaveCount(2)
  await expect(picker.getByRole('button', { name: '1', exact: true })).toBeDisabled()
  await expect(picker.getByRole('button', { name: '1', exact: true })).toHaveAttribute('aria-current', 'step')
  await expect(picker.getByRole('button', { name: '2', exact: true })).toBeDisabled()
  await page.keyboard.press('Escape')
  await expect(page.getByText('Question 2 of 3', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Next Question', exact: true }).click()
  await page.getByRole('button', { name: 'Reveal Answers', exact: true }).click()
  await page.getByRole('button', { name: 'Next Round', exact: true }).click()
  await expect(page.getByText('Round 2 of 2', { exact: true })).toBeVisible()
  await expect(page.getByText('Question 1 of 1', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Reveal Answers', exact: true }).click()
  await page.getByRole('button', { name: 'Jump to round', exact: true }).click()
  await expect(picker.getByRole('button', { name: '2', exact: true })).toBeDisabled()
  await picker.getByRole('button', { name: '1', exact: true }).click()
  await expect(page.getByText('Round 1 of 2', { exact: true })).toBeVisible()
  await expect(page.getByText('Question 1 of 3', { exact: true })).toBeVisible()
  await expect(page.getByText('Correct answer:', { exact: false })).toHaveCount(0)
  await page.getByRole('button', { name: 'Jump to question', exact: true }).click()
  const questionPicker = page.getByRole('dialog', { name: 'Jump to question', exact: true })
  await expect(questionPicker.getByRole('button', { name: '3', exact: true })).toBeEnabled()
  await questionPicker.getByRole('button', { name: '3', exact: true }).click()
  await expect(page.getByText('Question 3 of 3', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Jump to round', exact: true }).click()
  await expect(picker.getByRole('button', { name: '2', exact: true })).toBeEnabled()
  await picker.getByRole('button', { name: '2', exact: true }).click()
  await expect(page.getByText('Question 1 of 1', { exact: true })).toBeVisible()
  await expect(page.getByText('Correct answer:', { exact: false })).toHaveCount(0)
})

test('scrolls numbered question and round grids when there are many choices', async ({ page }, testInfo) => {
  await setup(page, 'host-only')
  const manyRounds = Array.from({ length: 80 }, (_, index) => ({
    ...rounds[0], id: `manyround${index}`, sequence_number: index + 1, title: `Round title ${index + 1}`,
  }))
  await page.route('**/api/collections/rounds/records?**', route => route.fulfill({
    json: { page: 1, perPage: 200, totalItems: manyRounds.length, totalPages: 1, items: manyRounds },
  }))
  const manyQuestions = Array.from({ length: 120 }, (_, index) => ({
    id: `manyquestion${index}`, host: hostId, game: gameId, round: manyRounds[0].id,
    question: questions[0].id, sequence: index + 1, category_name: questions[0].category,
    key: `shuffle-key-${index}`, expand: { question: questions[0] },
  }))
  await page.route('**/api/collections/game_questions/records?**', route => route.fulfill({
    json: { page: 1, perPage: 200, totalItems: manyQuestions.length, totalPages: 1, items: manyQuestions },
  }))
  await page.setViewportSize({ width: 375, height: 667 })
  await page.goto(`/controller/${gameId}`)
  for (const [kind, count] of [['question', 120], ['round', 80]] as const) {
    await page.getByRole('button', { name: `Jump to ${kind}`, exact: true }).click()
    const picker = page.getByRole('dialog', { name: `Jump to ${kind}`, exact: true })
    const grid = picker.getByRole('group')
    await expect(grid.getByRole('button')).toHaveCount(count)
    await expect(grid.getByRole('button', { name: '1', exact: true })).toBeDisabled()
    expect(await grid.evaluate(element => element.scrollHeight > element.clientHeight)).toBeTruthy()
    const box = await picker.boundingBox()
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.y).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(375)
    expect(box!.y + box!.height).toBeLessThanOrEqual(667)
    await page.screenshot({ path: testInfo.outputPath(`${kind}-picker.png`) })
    const last = grid.getByRole('button', { name: String(count), exact: true })
    await last.scrollIntoViewIfNeeded()
    await expect(last).toBeInViewport()
    await expect(last).toBeDisabled()
    await page.keyboard.press('Escape')
    await expect(picker).not.toBeVisible()
  }
  await expect(page.getByText('Round 1 of 80', { exact: true })).toBeVisible()
  await expect(page.getByText('Question 1 of 120', { exact: true })).toBeVisible()
  await expect(page.getByText('Correct answer:', { exact: false })).toHaveCount(0)
})

test('shows a recoverable error when round questions cannot be loaded', async ({ page }) => {
  await setup(page, 'host-only')
  await page.route('**/api/collections/game_questions/records?**', route => route.fulfill({ status: 500, json: { message: 'Unavailable' } }))
  await page.goto(`/controller/${gameId}`)
  await expect(page.getByRole('alert')).toContainText('Unable to load round questions')
  await page.unroute('**/api/collections/game_questions/records?**')
  await page.getByRole('button', { name: 'Retry', exact: true }).click()
  await expect(page.getByText('Question 1 of 3', { exact: true })).toBeVisible()
})

test('keeps the answer review available when completion fails', async ({ page }) => {
  await setup(page, 'host-only')
  await page.goto(`/controller/${gameId}`)
  await page.getByRole('button', { name: 'Next Question', exact: true }).click()
  await page.getByRole('button', { name: 'Next Question', exact: true }).click()
  await page.getByRole('button', { name: 'Reveal Answers', exact: true }).click()
  await page.getByRole('button', { name: 'Next Round', exact: true }).click()
  await page.getByRole('button', { name: 'Reveal Answers', exact: true }).click()
  await page.route(`**/api/collections/games/records/${gameId}`, route => {
    if (route.request().method() === 'PATCH') return route.fulfill({ status: 500, json: { message: 'Unavailable' } })
    return route.fallback()
  })
  await page.getByRole('button', { name: 'Game Complete', exact: true }).click()
  await expect(page.getByText('Unable to complete game. Please try again.', { exact: true })).toBeVisible()
  await expect(page.getByText(/Correct answer: [ABCD]\. George Washington/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Game Complete', exact: true })).toBeEnabled()
  await expect(page).toHaveURL(new RegExp(`/controller/${gameId}$`))
})

test('fits mobile, tablet, and desktop in light and dark mode', async ({ page }, testInfo) => {
  await setup(page, 'host-only')
  await page.goto(`/controller/${gameId}`)
  await expect(page.getByText('Question 1 of 3', { exact: true })).toBeVisible()
  for (const theme of ['Light', 'Dark']) {
    await page.getByRole('button', { name: /Current theme:/ }).click()
    await page.getByRole('menuitem', { name: theme, exact: true }).click()
    await expect(page.locator('html')).toHaveClass(theme.toLowerCase())
    for (const width of [375, 640, 1024]) {
      await page.setViewportSize({ width, height: 800 })
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy()
      const roundNumber = page.getByRole('button', { name: 'Jump to round', exact: true })
      const questionNumber = page.getByRole('button', { name: 'Jump to question', exact: true })
      const roundTotal = page.getByRole('button', { name: 'Total rounds', exact: true })
      const questionTotal = page.getByRole('button', { name: 'Total questions', exact: true })
      await expect(roundTotal).toBeDisabled()
      await expect(roundTotal).toHaveText('2')
      await expect(questionTotal).toBeDisabled()
      await expect(questionTotal).toHaveText('3')
      const counterBoxes = []
      for (const control of [roundNumber, roundTotal, questionNumber, questionTotal]) {
        const box = await control.boundingBox()
        expect(box?.height).toBeGreaterThanOrEqual(44)
        expect(box?.width).toBeGreaterThanOrEqual(44)
        counterBoxes.push(box!)
      }
      expect(new Set(counterBoxes.map(box => box.y)).size).toBe(1)
      expect(counterBoxes.map(box => box.x)).toEqual(counterBoxes.map(box => box.x).sort((a, b) => a - b))
      await expect(page.getByText('Science', { exact: true })).toHaveCSS('text-align', 'center')
      await expect(page.getByText('Round', { exact: true })).toBeVisible()
      await expect(page.getByText('Question', { exact: true })).toBeVisible()
      const title = (await page.getByText('Science', { exact: true }).boundingBox())!
      const roundLabel = (await page.getByText('Round', { exact: true }).boundingBox())!
      const questionLabel = (await page.getByText('Question', { exact: true }).boundingBox())!
      expect(title.y + title.height).toBeLessThanOrEqual(roundLabel.y)
      expect(roundLabel.y).toBe(questionLabel.y)
      expect(roundLabel.y + roundLabel.height).toBeLessThanOrEqual(counterBoxes[0].y)
      for (const [label, first, last] of [
        [roundLabel, counterBoxes[0], counterBoxes[1]],
        [questionLabel, counterBoxes[2], counterBoxes[3]],
      ]) {
        expect(Math.abs(label.x + label.width / 2 - (first.x + last.x + last.width) / 2)).toBeLessThan(1)
      }
      expect(Math.abs(title.x + title.width / 2 - (counterBoxes[0].x + counterBoxes[3].x + counterBoxes[3].width) / 2)).toBeLessThan(1)
      await expect(roundNumber).toBeEnabled()
      await expect(questionNumber).toBeEnabled()
      expect(await roundNumber.evaluate(element => getComputedStyle(element).backgroundColor))
        .not.toBe(await roundTotal.evaluate(element => getComputedStyle(element).backgroundColor))
      expect(await questionNumber.evaluate(element => getComputedStyle(element).backgroundColor))
        .not.toBe(await questionTotal.evaluate(element => getComputedStyle(element).backgroundColor))
      for (const control of [
        page.getByRole('button', { name: 'Next Question', exact: true }),
        page.getByRole('button', { name: 'Previous Question', exact: true }),
      ]) {
        expect((await control.boundingBox())?.height).toBeGreaterThanOrEqual(44)
      }
      if (width === 375) {
        await page.screenshot({ path: testInfo.outputPath(`host-only-${theme.toLowerCase()}.png`), fullPage: true })
      }
    }
  }
})

test('handles an empty round without invalid navigation or answer reveal', async ({ page }) => {
  await setup(page, 'host-only')
  await page.route('**/api/collections/game_questions/records?**', route => route.fulfill({
    json: { page: 1, perPage: 200, totalItems: 0, totalPages: 0, items: [] },
  }))
  await page.goto(`/controller/${gameId}`)
  await expect(page.getByText('No questions in this round.', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Reveal Answers', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Next Round', exact: true }).click()
  await expect(page.getByText('Round 2 of 2', { exact: true })).toBeVisible()
})
