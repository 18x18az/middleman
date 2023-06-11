import { getQualificationSchedule } from './dao/qualSchedule'
import { getTeamList } from './dao/teams'
import { setup } from './state/access'

async function main (): Promise<void> {
  await setup()
  const teams = await getTeamList()
  const blocks = await getQualificationSchedule(1)
  console.log(teams)
  console.log(blocks)
}

void main()

setInterval(function () { // TODO maybe use this as a heartbeat to alert if Middleman goes down
}, 1000 * 60 * 60)
