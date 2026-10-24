import { requirePageUser } from '../../lib/auth';
import Measurements from './Measurements';
export default async function Page(){const user=await requirePageUser(['admin','costureira']);return <Measurements role={user.role}/>;}
