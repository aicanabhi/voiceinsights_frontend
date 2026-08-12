import { MEDIA_STATUS } from '../api/media'

const CLASS_BY_STATUS = {
  [MEDIA_STATUS.PENDING]: 'pill pill-muted',
  [MEDIA_STATUS.PROCESSING]: 'pill pill-info',
  [MEDIA_STATUS.TRANSCRIBED]: 'pill pill-info',
  [MEDIA_STATUS.COMPLETED]: 'pill pill-active',
  [MEDIA_STATUS.FAILED]: 'pill pill-danger',
}

export default function StatusPill({ status }) {
  return <span className={CLASS_BY_STATUS[status] || 'pill pill-muted'}>{status}</span>
}
