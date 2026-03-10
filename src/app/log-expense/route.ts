import { redirect } from 'next/navigation';

export async function GET() {
    redirect('/?action=log-expense');
}
