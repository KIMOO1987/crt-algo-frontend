import { redirect } from 'next/navigation';

export default function AdminPage() {
  // Automatically send you to the payments validation sub-page
  redirect('/admin/payments');
}