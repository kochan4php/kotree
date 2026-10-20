'use client';

import { useEffect, useState } from 'react';
import { Brain, RefreshCw } from 'lucide-react';
import { toast } from '@/lib/toast';

const QUIZ_KEY = 'kotree-quiz-best';

// M55: five questions, all answered by real bits of the site itself.
const QUESTIONS: { question: string; options: string[]; answer: number }[] = [
  {
    question: 'Which year does the footer say this site started?',
    options: ['2020', '2022', '2024'],
    answer: 1,
  },
  {
    question: 'Which page lists the tools this site runs on?',
    options: ['/uses', '/status', '/secrets'],
    answer: 0,
  },
  {
    question: 'Which key opens the terminal from anywhere?',
    options: ['F2', '` (backtick)', 'Tab'],
    answer: 1,
  },
  {
    question: 'What is the guestbook message input called?',
    options: ['Confession box', 'The wall', 'Secret message'],
    answer: 2,
  },
  {
    question: 'Where do your secret discoveries live?',
    options: ['On the server', 'On this device only', 'In your account'],
    answer: 1,
  },
];

export default function QuizCard() {
  const [picked, setPicked] = useState<(number | null)[]>(() => QUESTIONS.map(() => null));
  const [best, setBest] = useState(0);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only store, applied after mount by design
      setBest(Number(localStorage.getItem(QUIZ_KEY)) || 0);
    } catch {
      // private mode — the best score just stays at zero
    }
  }, []);

  const answered = picked.filter((value) => value !== null).length;
  const complete = answered === QUESTIONS.length;
  const score = picked.reduce<number>((sum, value, index) => sum + (value === QUESTIONS[index].answer ? 1 : 0), 0);

  const pick = (questionIndex: number, optionIndex: number) => {
    if (complete) return; // retake first
    const next = [...picked];
    next[questionIndex] = optionIndex;
    setPicked(next);

    if (next.every((value) => value !== null)) {
      const total = next.reduce<number>((sum, value, i) => sum + (value === QUESTIONS[i].answer ? 1 : 0), 0);
      if (total > best) {
        setBest(total);
        try {
          localStorage.setItem(QUIZ_KEY, String(total));
        } catch {
          // private mode — the score is shown but not remembered
        }
      }
      if (total === QUESTIONS.length) toast.success('Perfect score — you know this place by heart.');
    }
  };

  const retake = () => setPicked(QUESTIONS.map(() => null));

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Brain className="w-4 h-4 text-accent-ink" aria-hidden="true" />
        <p className="text-sm font-black uppercase tracking-wider text-foreground">
          Quiz {complete && `— ${score}/${QUESTIONS.length}`}
        </p>
        {best > 0 && (
          <span className="rounded border-2 border-foreground bg-card px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-foreground">
            best {best}/{QUESTIONS.length}
          </span>
        )}
        {complete && (
          <button
            type="button"
            onClick={retake}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg border-2 border-foreground bg-secondary px-2.5 py-1.5 text-[11px] font-bold text-foreground shadow-[2px_2px_0_0_var(--foreground)] transition-transform hover:-translate-y-0.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" /> Retake
          </button>
        )}
      </div>

      <ol className="space-y-3">
        {QUESTIONS.map((item, questionIndex) => {
          const chosen = picked[questionIndex];
          return (
            <li key={item.question}>
              <p className="mb-1.5 text-xs font-bold text-foreground">
                {questionIndex + 1}. {item.question}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {item.options.map((option, optionIndex) => {
                  const isChosen = chosen === optionIndex;
                  const isAnswer = optionIndex === item.answer;
                  const revealed = complete;
                  const tone = !revealed
                    ? isChosen
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-card text-foreground hover:bg-secondary'
                    : isAnswer
                      ? 'bg-green-200 text-[#14110f]'
                      : isChosen
                        ? 'bg-red-200 text-[#14110f]'
                        : 'bg-card text-muted-foreground';
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => pick(questionIndex, optionIndex)}
                      aria-pressed={isChosen}
                      disabled={complete}
                      className={`rounded-lg border-2 border-foreground px-2.5 py-1.5 text-[11px] font-bold shadow-[2px_2px_0_0_var(--foreground)] transition-transform cursor-pointer disabled:cursor-default ${tone}`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ol>

      <p className="mt-3 text-[11px] font-medium text-muted-foreground" role="status">
        {complete
          ? score === QUESTIONS.length
            ? 'All five right — the badge is yours.'
            : `You got ${score} of ${QUESTIONS.length}. Retake to chase a perfect score.`
          : `${answered} of ${QUESTIONS.length} answered`}
      </p>
    </div>
  );
}
