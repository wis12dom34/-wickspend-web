import {wickspendApi} from "@/lib/api";

export type SmartSupportContext={page:string;module:string;reference?:string;product?:string};
export const supportApi={
 history:(token:string,context:SmartSupportContext)=>wickspendApi<any>("wickspend/backend/support/history",{token,headers:{"X-WickSpend-Page":context.page,"X-WickSpend-Module":context.module}}),
 chat:(token:string,input:{message:string;context:SmartSupportContext})=>wickspendApi<any>("wickspend/backend/support/chat",{method:"POST",token,body:JSON.stringify(input)}),
 handoff:(token:string,input:{message?:string;context:SmartSupportContext})=>wickspendApi<any>("wickspend/backend/support/handoff",{method:"POST",token,body:JSON.stringify(input)}),
};
