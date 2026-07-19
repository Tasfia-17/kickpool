'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Plus, X, Check, GripVertical, Trash2, Star, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  createdAt: number;
}

const PRIORITY_COLORS = {
  low: { bg: 'bg-gray-100 dark:bg-gray-700', border: 'border-gray-300', text: 'text-gray-600' },
  medium: { bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-400', text: 'text-yellow-600' },
  high: { bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-400', text: 'text-red-600' },
};

export function StudyTodoList() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [input, setInput] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const inputRef = useRef<HTMLInputElement>(null);

  // Load todos from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('study-todos');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Migrate old format if needed
        const migrated = parsed.map((todo: any) => ({
          ...todo,
          priority: todo.priority || 'medium',
          createdAt: todo.createdAt || Date.now(),
        }));
        setTodos(migrated);
      }
    } catch (e) {
      console.error('Failed to load todos:', e);
    }
  }, []);

  // Save todos to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('study-todos', JSON.stringify(todos));
    } catch (e) {
      console.error('Failed to save todos:', e);
    }
  }, [todos]);

  // Filter and sort todos
  const filteredTodos = useMemo(() => {
    let result = [...todos];

    // Apply filter
    if (filter === 'active') {
      result = result.filter(t => !t.completed);
    } else if (filter === 'completed') {
      result = result.filter(t => t.completed);
    }

    // Sort: incomplete first, then by priority, then by creation date
    result.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return b.createdAt - a.createdAt;
    });

    return result;
  }, [todos, filter]);

  // Stats
  const stats = useMemo(() => ({
    total: todos.length,
    completed: todos.filter(t => t.completed).length,
    active: todos.filter(t => !t.completed).length,
  }), [todos]);

  // Add new todo
  const addTodo = useCallback(() => {
    if (!input.trim()) return;

    const newTodo: Todo = {
      id: Date.now().toString(),
      text: input.trim(),
      completed: false,
      priority,
      createdAt: Date.now(),
    };

    setTodos(prev => [newTodo, ...prev]);
    setInput('');
    inputRef.current?.focus();
  }, [input, priority]);

  // Toggle todo completion
  const toggleTodo = useCallback((id: string) => {
    setTodos(prev => prev.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  }, []);

  // Delete todo with animation
  const deleteTodo = useCallback((id: string) => {
    setTodos(prev => prev.filter(todo => todo.id !== id));
  }, []);

  // Clear completed todos
  const clearCompleted = useCallback(() => {
    setTodos(prev => prev.filter(todo => !todo.completed));
  }, []);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addTodo();
    }
  }, [addTodo]);

  return (
    <div
      className="space-y-3"
      style={{ fontFamily: 'VT323, monospace' }}
    >
      {/* Input Section */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a new task..."
            className="flex-1 px-3 py-2 border-2 border-black dark:border-white bg-white dark:bg-gray-800 text-black dark:text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all"
            maxLength={100}
          />
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={addTodo}
            disabled={!input.trim()}
            className="p-2 border-2 border-black bg-pink-500 text-white hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
            aria-label="Add task"
          >
            <Plus size={16} />
          </motion.button>
        </div>

        {/* Priority Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Priority:</span>
          {(['low', 'medium', 'high'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPriority(p)}
              className={`px-2 py-1 text-xs font-bold border-2 border-black transition-all ${
                priority === p
                  ? `${PRIORITY_COLORS[p].bg} shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]`
                  : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {p === 'high' && '🔥'} {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 border-2 border-black p-1 bg-gray-100 dark:bg-gray-800">
        {(['all', 'active', 'completed'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 px-2 py-1 text-xs font-bold transition-all ${
              filter === f
                ? 'bg-black text-white dark:bg-white dark:text-black'
                : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-black dark:text-white'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f === 'all' && ` (${stats.total})`}
            {f === 'active' && ` (${stats.active})`}
            {f === 'completed' && ` (${stats.completed})`}
          </button>
        ))}
      </div>

      {/* Todo List */}
      <div
        className="space-y-2 max-h-64 overflow-y-auto pr-1 scrollbar-thin"
        style={{
          backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, rgba(0,0,0,0.05) 31px, rgba(0,0,0,0.05) 32px)',
        }}
      >
        <AnimatePresence mode="popLayout">
          {filteredTodos.length === 0 ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-gray-500 dark:text-gray-400 text-center py-8"
            >
              {filter === 'all'
                ? '📝 No tasks yet. Add one above!'
                : filter === 'active'
                  ? '✅ All tasks completed!'
                  : '📋 No completed tasks'}
            </motion.p>
          ) : (
            filteredTodos.map((todo) => (
              <motion.div
                key={todo.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                className={`flex items-center gap-2 p-2 border-2 border-black ${PRIORITY_COLORS[todo.priority].bg} transition-all ${
                  todo.completed ? 'opacity-60' : ''
                }`}
              >
                {/* Checkbox */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => toggleTodo(todo.id)}
                  className={`w-5 h-5 border-2 border-black flex items-center justify-center flex-shrink-0 transition-all ${
                    todo.completed
                      ? 'bg-green-500 text-white'
                      : 'bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                  aria-label={todo.completed ? 'Mark as incomplete' : 'Mark as complete'}
                >
                  {todo.completed && <Check size={12} strokeWidth={3} />}
                </motion.button>

                {/* Todo Text */}
                <span
                  className={`flex-1 text-sm font-mono transition-all ${
                    todo.completed
                      ? 'line-through text-gray-500 dark:text-gray-400'
                      : 'text-black dark:text-white'
                  }`}
                >
                  {todo.text}
                </span>

                {/* Priority Indicator */}
                {todo.priority === 'high' && !todo.completed && (
                  <Star size={14} className="text-red-500 flex-shrink-0" fill="currentColor" />
                )}

                {/* Delete Button */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => deleteTodo(todo.id)}
                  className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors flex-shrink-0"
                  aria-label="Delete task"
                >
                  <Trash2 size={14} className="text-red-500" />
                </motion.button>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Footer Stats & Actions */}
      {todos.length > 0 && (
        <div className="flex items-center justify-between text-xs pt-2 border-t-2 border-gray-200 dark:border-gray-700">
          <span className="text-gray-500 dark:text-gray-400 font-bold">
            {stats.active} tasks remaining
          </span>
          {stats.completed > 0 && (
            <button
              onClick={clearCompleted}
              className="text-red-500 hover:text-red-600 font-bold hover:underline transition-colors"
            >
              Clear completed ({stats.completed})
            </button>
          )}
        </div>
      )}
    </div>
  );
}

