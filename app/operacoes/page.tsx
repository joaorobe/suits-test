import { requirePageUser } from '../../lib/auth';
import { today } from '../../lib/rules';
import Operations from './Operations';
export default async function Page(){await requirePageUser('admin');return <Operations today={today()}/>;}
