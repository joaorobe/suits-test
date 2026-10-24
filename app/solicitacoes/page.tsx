import { requirePageUser } from '../../lib/auth';
import RequestsAdmin from './RequestsAdmin';
export default async function Page(){await requirePageUser('admin');return <RequestsAdmin/>;}
