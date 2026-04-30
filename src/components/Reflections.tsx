'use client';

/**
 * Three findings from the CS156 paper, in the voice of the chapter
 * narratives. Sits between the last chapter (NYC) and the Conclusion.
 *
 * Sources (for fact-check):
 *   - P1 — §4.3.1 metric tables + §7 Executive Summary (unsupervised).
 *     Agglomerative bootstrapped Davies-Bouldin 0.5473 (rounded 0.547),
 *     Calinski-Harabasz 129.8598 (rounded 129.86). KMeans bootstrapped
 *     Silhouette 0.5237, Agglomerative 0.5096 — KMeans narrowly highest.
 *     Spectral single-run Silhouette 0.3838, lowest on all metrics.
 *   - P2 — §10 Executive Summary (supervised). 4-category CNN test
 *     accuracy 0.3810; CNN 2-category 0.7143; XGBoost 0.7143 with
 *     F1(neutral)=0.83 and F1(positive)=0.00.
 *   - P3 — §11 Executive Comparison. Direct paraphrase of the paper's
 *     own closing framing that unsupervised is "preferable" for
 *     exploratory analysis without predefined labels.
 */
export default function Reflections() {
  return (
    <section
      data-section="reflections"
      className="min-h-screen relative z-10 py-20 sm:py-24 md:py-32 flex items-center justify-center"
    >
      <div className="container mx-auto px-4 sm:px-8 max-w-3xl">
        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-serif text-white/90 mb-4 sm:mb-6 text-center">
          What the machine found
        </h2>
        <p className="text-xs text-white/40 font-mono uppercase tracking-widest text-center mb-12 sm:mb-16">
          Three findings from the CS156 paper
        </p>

        <div className="space-y-10 sm:space-y-12">
          <Finding source="§4.3.1 metric tables + §7 Executive Summary">
            Three algorithms clustered the same audio. KMeans,
            Agglomerative, and Spectral. They did not agree.
            Agglomerative won on two metrics of cluster separation: a
            Davies-Bouldin Index of 0.547, a Calinski-Harabasz of
            129.86. KMeans won the Silhouette score by a narrow margin.
            Spectral came last on everything. The methods agreed that
            there was structure in the audio. They disagreed about what
            it was.
          </Finding>

          <Finding source="§10 Executive Summary (supervised)">
            The supervised models started with four emotion categories:
            introspective, excited, neutral, sad. The best classifier
            hit 38.1% accuracy. Reducing to two categories, positive
            and neutral, lifted accuracy to 71.4%. But the F1 score on
            the positive class was 0.00. Every positive clip ended up
            in the neutral bucket. Emotion labels did not map onto
            audio features. The label was the wrong axis.
          </Finding>

          <Finding source="§11 Executive Comparison">
            The clusters found structure. The labels did not. Four
            emotion categories couldn&apos;t separate audio that three
            clustering algorithms could. The paper&apos;s own framing:
            for exploratory analysis without predefined labels, the
            unsupervised approach is preferable. Put plainly: the
            useful axes of variation in a voice may not be the ones
            humans have words for. That is the finding the supervised
            pipeline couldn&apos;t reach.
          </Finding>
        </div>
      </div>
    </section>
  );
}

interface FindingProps {
  children: React.ReactNode;
  source: string;
}

function Finding({ children, source }: FindingProps) {
  return (
    <div className="border-l-2 border-white/20 pl-4 sm:pl-6">
      <p className="text-sm sm:text-base md:text-lg text-white/80 leading-relaxed font-serif mb-3 sm:mb-4">
        {children}
      </p>
      <p className="text-[0.65rem] sm:text-xs text-white/40 font-mono uppercase tracking-widest">
        {source}
      </p>
    </div>
  );
}
