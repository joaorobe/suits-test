import { requirePageUser } from '../../lib/auth';
import { customerData } from '../../lib/customer-reservations';
import Dashboard from './ui/Dashboard';
export default async function Page(){const user=await requirePageUser('cliente');return <Dashboard initial={await customerData(user.id)}/>;}
