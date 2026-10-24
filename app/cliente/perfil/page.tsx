import { requirePageUser } from '../../../lib/auth';
import { customerData } from '../../../lib/customer-reservations';
import Profile from '../ui/Profile';
export default async function Page(){const user=await requirePageUser('cliente');return <Profile initial={await customerData(user.id)}/>;}
