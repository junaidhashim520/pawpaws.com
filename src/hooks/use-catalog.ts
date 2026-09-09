import { useEffect, useState } from 'react';
import type { Catalog } from '@/data/products';
export function useCatalog(){
 const [data,setData]=useState<Catalog>({products:[],categories:[],petGroups:[]});
 const [loading,setLoading]=useState(true);const [error,setError]=useState('');
 useEffect(()=>{let alive=true;let active=false;const controller=new AbortController();const fetchCatalog=async()=>{if(active)return;active=true;try{const response=await fetch('/api/catalog',{signal:controller.signal});if(!response.ok)throw new Error('The shop could not load. Please check the server and try again.');const result=await response.json();if(alive){setData(result);setError('');}}catch(e){if(alive)setError(e instanceof Error?e.message:'Unable to load the shop.');}finally{active=false;if(alive)setLoading(false);}};void fetchCatalog();const refresh=()=>{if(document.visibilityState==='visible')void fetchCatalog();};window.addEventListener('focus',refresh);window.addEventListener('pawpass:catalog',refresh);const interval=setInterval(refresh,15000);return()=>{alive=false;controller.abort();clearInterval(interval);window.removeEventListener('focus',refresh);window.removeEventListener('pawpass:catalog',refresh);};},[]);
 return {...data,loading,error};
}
