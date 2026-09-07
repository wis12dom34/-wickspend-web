import {wickspendApi} from "@/lib/api";

export type SmartSupportContext={page:string;module:string;reference?:string;product?:string};
export const supportApi={
 history:(token:string,context:SmartSupportContext)=>wickspendApi<any>("wickspend/backend/support/history",{token,headers:{"X-WickSpend-Page":context.page,"X-WickSpend-Module":context.module}}),
 chat:(token:string,input:{message:string;context:SmartSupportContext})=>wickspendApi<any>("wickspend/backend/support/chat",{method:"POST",token,body:JSON.stringify(input)}),
 handoff:(token:string,input:{message?:string;context:SmartSupportContext})=>wickspendApi<any>("wickspend/backend/support/handoff",{method:"POST",token,body:JSON.stringify(input)}),
 adminList:(token:string,status="all")=>wickspendApi<any>(`wickspend/backend/admin/support?status=${encodeURIComponent(status)}`,{token}),
 adminConversation:(token:string,id:number)=>wickspendApi<any>(`wickspend/backend/admin/support/conversation?conversation_id=${encodeURIComponent(String(id))}`,{token}),
 adminReply:(token:string,input:{conversation_id:number;message?:string;status?:"open"|"resolved"})=>wickspendApi<any>("wickspend/backend/admin/support/reply",{method:"POST",token,body:JSON.stringify(input)}),
};
