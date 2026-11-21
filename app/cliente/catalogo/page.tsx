import { requirePageUser } from '../../../lib/auth';
import { today } from '../../../lib/rules';
import Catalog from '../ui/Catalog';
export default async function Page({searchParams}:{searchParams:Promise<{modo?:string;provador?:string}>}){await requirePageUser('cliente');const params=await searchParams;return <Catalog initialDate={today()} initialView={params.modo==='quiz'?'quiz':params.provador==='1'?'catalog':'welcome'} showTryOnIntro={params.provador==='1'}/>;}
