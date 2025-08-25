export async function listTodos() {
  const res = await fetch('/api/todos', { credentials: 'include' });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
export async function createTodo(todo:any) {
  const res = await fetch('/api/todos', {
    method:'POST', headers:{'Content-Type':'application/json'},
    credentials:'include', body: JSON.stringify(todo)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
export async function updateTodo(todo:any) {
  const res = await fetch('/api/todos', {
    method:'PUT', headers:{'Content-Type':'application/json'},
    credentials:'include', body: JSON.stringify(todo)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
export async function deleteTodo(id:string) {
  const res = await fetch(`/api/todos?id=${encodeURIComponent(id)}`, {
    method:'DELETE', credentials:'include'
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
