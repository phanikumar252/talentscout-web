import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useAppDispatch, useAppSelector } from '@/app/withTypes';
import type { ChatMessage } from '@/types/api';
import { sendChatMessage } from './chatThunks';
import { selectIsStreaming, selectLiveTurn, turnFinished } from './workspaceSlice';

const EXAMPLES = [
  'Senior React developer in Austin or remote, 5+ years, TypeScript and GraphQL, not from Google',
  'Data engineer with Spark and Airflow in Bengaluru, 3-7 years',
  'DevOps engineer with Kubernetes and Terraform in Berlin, open to work',
];

interface Props {
  searchId: string;
  messages: ChatMessage[];
}

export function ConversationPanel({ searchId, messages }: Props) {
  const dispatch = useAppDispatch();
  const liveTurn = useAppSelector(selectLiveTurn);
  const isStreaming = useAppSelector(selectIsStreaming);
  const [draft, setDraft] = useState('');
  const streamRef = useRef<{ abort: () => void } | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Cancel an in-flight stream when leaving the page or switching search.
  useEffect(() => () => streamRef.current?.abort(), [searchId]);

  // Keep the newest content in view while the reply streams in.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length, liveTurn?.reply, liveTurn?.steps.length]);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;
    streamRef.current = dispatch(sendChatMessage({ searchId, text: trimmed }));
    setDraft('');
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    send(draft);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      send(draft);
    }
  };

  const isEmpty = messages.length === 0 && !liveTurn;

  return (
    <aside className="conversation" aria-label="Assistant">
      <div className="conversation__log" role="log" aria-live="polite">
        {isEmpty && (
          <div className="conversation__intro">
            <p>
              <strong>Who are you looking for?</strong> Describe the role, skills, location and experience. Then refine it: “add GraphQL”, “drop Austin”, “not from Meta”.
            </p>
            <div className="examples">
              {EXAMPLES.map((example) => (
                <button key={example} type="button" className="example" onClick={() => send(example)}>
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id} className={`bubble bubble--${message.role}`}>
            {message.content}
          </div>
        ))}

        {liveTurn && (
          <>
            <div className="bubble bubble--user">{liveTurn.userText}</div>
            {liveTurn.steps.length > 0 && (
              <ol className="steps" aria-label="Assistant progress">
                {liveTurn.steps.map((step, index) => {
                  const done = index < liveTurn.steps.length - 1 || liveTurn.reply.length > 0;
                  return (
                    <li key={step.id} className={done ? 'steps__item steps__item--done' : 'steps__item'}>
                      {step.label}
                    </li>
                  );
                })}
              </ol>
            )}
            {liveTurn.reply && (
              <div className="bubble bubble--assistant">
                {liveTurn.reply}
                {liveTurn.status === 'streaming' && <span className="cursor" aria-hidden="true" />}
              </div>
            )}
            {liveTurn.status === 'failed' && (
              <div className="alert alert--error" role="alert">
                {liveTurn.error}{' '}
                <button type="button" className="link-button" onClick={() => dispatch(turnFinished())}>
                  Dismiss
                </button>
              </div>
            )}
          </>
        )}
        <div ref={endRef} />
      </div>

      <form className="composer" onSubmit={handleSubmit}>
        <textarea
          aria-label="Message the assistant"
          placeholder={isStreaming ? 'Assistant is answering…' : 'Describe or refine the search (Enter to send)'}
          value={draft}
          rows={3}
          maxLength={2000}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className="composer__actions">
          {isStreaming ? (
            <button type="button" className="button" onClick={() => streamRef.current?.abort()}>
              Stop
            </button>
          ) : (
            <button type="submit" className="button button--primary" disabled={!draft.trim()}>
              Send
            </button>
          )}
        </div>
      </form>
    </aside>
  );
}
