import { requirePageUser } from '../../../lib/auth';
import { today } from '../../../lib/rules';
import Catalog from '../ui/Catalog';
export default async function Page(){await requirePageUser('cliente');return <Catalog initialDate={today()}/>;}
