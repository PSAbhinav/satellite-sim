import { useState } from 'react';
import { Lock } from 'lucide-react';
import { motion } from 'motion/react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { FormulaBlock } from '@/components/FormulaBlock';
import { CATEGORY_LABELS, conceptsByCategory, isUnlocked } from '@/content/registry';
import { MILESTONE_HINTS, type Concept } from '@/content/types';
import { useMissionStore } from '@/state/useMissionStore';
import { useUiStore } from '@/state/useUiStore';

export default function Spacepedia() {
  const unlocked = useMissionStore((s) => s.unlockedPedia);
  const ageLevel = useUiStore((s) => s.ageLevel);
  const [open, setOpen] = useState<Concept | null>(null);
  const byCat = conceptsByCategory();
  const categories = [...byCat.keys()];

  return (
    <div className="mx-auto max-w-5xl p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-starlight">Spacepedia</h1>
        <p className="text-sm text-muted-star">
          Everything you have learned so far. New entries unlock as your missions progress.
        </p>
      </header>

      <Tabs defaultValue={categories[0]}>
        <TabsList className="flex-wrap h-auto">
          {categories.map((cat) => {
            const entries = byCat.get(cat)!;
            const n = entries.filter((c) => isUnlocked(c, unlocked)).length;
            return (
              <TabsTrigger key={cat} value={cat}>
                {CATEGORY_LABELS[cat] ?? cat}
                <span className="ml-1.5 telemetry text-[10px] opacity-60">
                  {n}/{entries.length}
                </span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {categories.map((cat) => (
          <TabsContent key={cat} value={cat}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {byCat.get(cat)!.map((c, i) => {
                const ok = isUnlocked(c, unlocked);
                return (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03, duration: 0.25 }}
                  >
                    {ok ? (
                      <Card
                        className="h-full cursor-pointer transition-colors hover:border-phosphor/50"
                        onClick={() => setOpen(c)}
                      >
                        <CardContent className="p-4">
                          <div className="font-display font-semibold text-phosphor">{c.term}</div>
                          <p className="mt-1 text-xs leading-relaxed text-muted-star">{c.short}</p>
                        </CardContent>
                      </Card>
                    ) : (
                      <Card className="h-full opacity-50">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 font-display text-muted-star">
                            <Lock className="size-3.5" /> ???
                          </div>
                          <p className="mt-1 text-xs text-muted-star/70">
                            {MILESTONE_HINTS[c.unlock]}
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          {open && (
            <>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-phosphor">{open.term}</DialogTitle>
                <Badge variant="ion">{ageLevel}</Badge>
              </div>
              <p className="text-xs italic text-muted-star">{open.short}</p>
              <p className="mt-3 text-sm leading-relaxed">{open.levels[ageLevel]}</p>
              {open.formula && ageLevel !== 'kid' && (
                <div className="mt-4">
                  <FormulaBlock formula={open.formula} />
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
