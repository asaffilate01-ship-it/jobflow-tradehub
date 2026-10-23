import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import KycGate from './KycGate';
const state=vi.hoisted(()=>({user:{id:'test'},roles:['trade'],result:{data:null,error:null} as any}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:state.user,roles:state.roles})}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{from:()=>({select:()=>({eq:()=>({single:()=>Promise.resolve(state.result)})})})}}));
function show(path='/dashboard'){render(<MemoryRouter initialEntries={[path]}><KycGate><div>Private content</div></KycGate></MemoryRouter>)}
beforeEach(()=>{state.result={data:null,error:null}});
describe('KYC access',()=>{
 it('allows the protected upload route before approval',async()=>{show('/kyc-upload');await waitFor(()=>expect(screen.getByText('Private content')).toBeInTheDocument())});
 it('does not approve missing profiles',async()=>{show();await screen.findByText('KYC Verification Required');expect(screen.queryByText('Private content')).toBeNull()});
 it('does not approve a failed profile lookup',async()=>{state.result={data:null,error:{message:'offline'}};show();await screen.findByText('KYC Verification Required');expect(screen.queryByText('Private content')).toBeNull()});
 it('allows verified users',async()=>{state.result={data:{kyc_status:'approved'},error:null};show();await waitFor(()=>expect(screen.getByText('Private content')).toBeInTheDocument())});
});
