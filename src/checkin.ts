import { IInspectionStatus } from '@18x18az/rosetta'
import { tm } from './request'
import { getTeamIdFromNumber } from './teams'

export async function getReconciledCheckIn (upstream: IInspectionStatus): Promise<IInspectionStatus> {
  const raw = await tm.getTable('admin/checkin/summary')
    .catch(err => {
      if (err.includes('ECONNREFUSED')) {
        return []
      } else {
        throw err
      }
    })

  raw.forEach((row) => {
    const columns = Array.from(row.cells).map((cell: any) => (cell.textContent))
    const team = getTeamIdFromNumber(columns[0])
    const status = columns[1].trim()
    if (status === 'No') {
      const match = upstream.notStarted.findIndex(element => element === team)
      if (match > -1) {
        upstream.notStarted.splice(match, 1)
        upstream.notCheckedIn.push(team)
      } else {
        // TODO handle team inspected but not checked in
      }
    }
  })

  return upstream
}
