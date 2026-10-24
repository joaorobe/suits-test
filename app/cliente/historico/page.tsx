import { requirePageUser } from '../../../lib/auth';
import { customerData } from '../../../lib/customer-reservations';
import BookingViews from '../ui/BookingViews';
export default async function Page(){const user=await requirePageUser('cliente');return <BookingViews mode="historico" initial={await customerData(user.id)}/>;}
