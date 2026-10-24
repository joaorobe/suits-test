import { notFound } from 'next/navigation';
import { requirePageUser } from '../../../../lib/auth';
import { customerData } from '../../../../lib/customer-reservations';
import BookingViews from '../../ui/BookingViews';
export default async function Page({params}:{params:Promise<{id:string}>}){const user=await requirePageUser('cliente');const {id}=await params;const data=await customerData(user.id);if(!data.bookings.some(item=>item.id===id))notFound();return <BookingViews mode="detalhe" selectedId={id} initial={data}/>;}
