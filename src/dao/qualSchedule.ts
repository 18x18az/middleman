import { tmDatabase } from '../repository/tmDatabase'
import { adminServer } from '../repository/tmWebserver'

interface Alliance {
  team1: number
  team2: number
}

interface ScheduledQualificationMatch {
  matchNumber: number
  redAlliance: Alliance
  blueAlliance: Alliance
}

interface RawScheduleBlock {
  start: Date
  end: Date
  numMatches: number
}

interface RawMatchBlock {
  start: Date
  end: Date
  matches: ScheduledQualificationMatch[]
}

async function getRawScheduleBlocks (): Promise<RawScheduleBlock[]> {
  const rawBlocks = await tmDatabase.getAll('schedule_blocks')

  return rawBlocks.map((rawBlock: any) => {
    const startSeconds = rawBlock.start
    const endSeconds = rawBlock.stop
    const duration = endSeconds - startSeconds
    const cycleTime = rawBlock.cycle_time

    const start = new Date(startSeconds * 1000)
    const end = new Date(endSeconds * 1000)
    const numMatches = Math.ceil(duration / cycleTime)

    return { start, end, numMatches }
  })
}

async function getRawQualMatches (): Promise<ScheduledQualificationMatch[]> {
  const rawMatchList = await adminServer.getTable('division1/matches')

  return rawMatchList.flatMap(row => {
    const columns = Array.from(row.cells).map((cell: any) => (cell.textContent))

    const matchName = columns[0] as string
    if (!matchName.startsWith('Q')) {
      return []
    }

    const matchNumber = parseInt(matchName.split('Q')[1])

    const redAlliance: Alliance = {
      team1: columns[1],
      team2: columns[2]
    }

    const blueAlliance: Alliance = {
      team1: columns[3],
      team2: columns[4]
    }

    return ({
      matchNumber, redAlliance, blueAlliance
    })
  })
}

export async function getQualificationSchedule (): Promise<RawMatchBlock[]> {
  const rawMatches = await getRawQualMatches()
  const rawBlocks = await getRawScheduleBlocks()

  return rawBlocks.map(block => {
    const thisBlock = rawMatches.splice(0, block.numMatches)
    return {
      start: block.start,
      end: block.end,
      matches: thisBlock
    }
  })
}
