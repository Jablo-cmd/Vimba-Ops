export function todayISO(date=new Date()):string{const year=date.getFullYear();const month=String(date.getMonth()+1).padStart(2,"0");const day=String(date.getDate()).padStart(2,"0");return year+"-"+month+"-"+day}
export function isValidDateRange(start:string,end:string):boolean{return !!start&&!!end&&start<=end}
export function formatDateTime(value:unknown):string{if(typeof value!=="string"||!value)return "—";const date=new Date(value);return Number.isNaN(date.getTime())?"—":date.toLocaleString()}
