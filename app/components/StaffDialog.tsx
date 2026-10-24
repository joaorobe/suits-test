'use client';
import { useEffect,useRef } from 'react';
export default function StaffDialog({children,label,onClose}:{children:React.ReactNode;label:string;onClose:()=>void}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const dialog=ref.current;const previous=document.activeElement as HTMLElement|null;dialog?.showModal();return()=>{dialog?.close();previous?.focus();};},[]);
 return <dialog ref={ref} aria-label={label} onCancel={event=>{event.preventDefault();onClose();}} className="staff-dialog staff-workspace"><div className="staff-dialog-content">{children}</div></dialog>;
}
