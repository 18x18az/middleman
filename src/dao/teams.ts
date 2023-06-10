import { RawTeam } from '@18x18az/rosetta'
import { adminServer } from '../repository/tmWebserver'

export async function getTeamList (): Promise<RawTeam[]> {
  const raw = await adminServer.getTable('division1/teams')

  const teams = raw.map((row: any) => {
    const columns = Array.from(row.cells).map((cell: any) => (cell.textContent))
    return { number: columns[0], name: columns[1], location: columns[2], school: columns[3] }
  })

  return teams
}
