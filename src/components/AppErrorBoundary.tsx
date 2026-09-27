import {Component,type ErrorInfo,type ReactNode} from "react";
import {Button,Card} from "./ui";

type Props={children:ReactNode};
type State={hasError:boolean};

export default class AppErrorBoundary extends Component<Props,State>{
  override state:State={hasError:false};
  static getDerivedStateFromError():State{return{hasError:true}}
  override componentDidCatch(error:Error,info:ErrorInfo){if(import.meta.env.DEV)console.error("Vimba Ops runtime error",error,info)}
  render(){if(!this.state.hasError)return this.props.children;return <div className="grid min-h-screen place-items-center bg-slate-50 p-6"><Card className="max-w-lg p-8 text-center"><h1 className="text-xl font-bold text-slate-900">Vimba Ops could not display this screen</h1><p className="mt-2 text-sm text-slate-500">The application recovered the session boundary, but this screen encountered an unexpected error.</p><Button className="mt-6" onClick={()=>this.setState({hasError:false})}>Try again</Button></Card></div>}
}