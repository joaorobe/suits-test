import { requirePageUser } from '../../lib/auth';
import CustomerShell from './ui/CustomerShell';
export default async function CustomerLayout({children}:{children:React.ReactNode}){
 const user=await requirePageUser('cliente');return <CustomerShell name={user.name}>{children}</CustomerShell>;
}
