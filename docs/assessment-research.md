# Assessment research and product boundary

Last reviewed: 2026-07-20

BrightPath is an independent skill-practice product. This document records public facts used to map grades to broad practice activities. It is not an administration manual, and this repository must never contain Pearson test content.

## Scope

Pearson's current assessment matrix covers Pre-K through Grade 12. Schools select batteries, so there is no single required national set. Grade 9–12 students use Grade 8 forms for several measures. The app exposes the English core academic pathway; Spanish forms are a future original-content localization project. Dyslexia, behavior, and social-emotional screeners are intentionally excluded because they are not appropriate tests to rehearse.

## Public measure map

| Domain | Measure | Grades | Published administration shape |
| --- | --- | --- | --- |
| Early literacy | Print Concepts | Pre-K–K | Individual, about 2–3 minutes |
| Early literacy | Initial Sounds | Pre-K–K | Individual, about 2–3 minutes |
| Early literacy | Auditory Vocabulary | Pre-K–1 | Individual, about 2–4 minutes |
| Early literacy | Letter Naming Fluency | Pre-K–1 | Individual, 1 minute |
| Early literacy | Letter Word Sounds Fluency | Pre-K–1 | Individual, 1 minute |
| Early literacy | Phoneme Segmentation | K–1 | Individual, about 2–3 minutes |
| Early literacy | Nonsense Word Fluency | K–1 | Individual, 1 minute |
| Early literacy | Word Reading Fluency | K–1 | Individual, 1 minute |
| Reading | Listening Comprehension | K–2 | Adult-read, about 10–15 minutes |
| Reading | Spelling | K–12 | Dictated response; upper grades may be an add-on |
| Reading | Oral Reading Fluency | 1–12 | Adult-recorded; one-minute passages |
| Reading | Vocabulary | 2–12 | Student online, untimed |
| Reading | Reading Comprehension | 2–12 | Student online, untimed |
| Reading | Silent Reading Fluency | 4–12 | Student online; passage rates |
| Reading classic | Reading Maze and Written Expression | 1–12 | Paper/pencil, brief timed measures |
| Math | Quantity Total Fluency | Pre-K–K | Individual, 1 minute |
| Math | Number Naming Fluency | Pre-K–1 | Individual, about 1 minute |
| Math | Quantity Difference Fluency | K | Individual, 1 minute |
| Math | Concepts & Applications | Pre-K–12 | Individual early; online from Grade 2 |
| Math | Number Comparison Fluency—Pairs | Grade 1 | Individual, 1 minute |
| Math | Math Facts Fluency | Grade 1 | Individual, 1 minute |
| Math | Number Comparison Fluency—Triads | 2–12 | Student online, 3 minutes |
| Math | Mental Computation Fluency | 2–12 | Student online, 4 minutes |
| Math classic | M-CAP | 2–12 | Paper/pencil, 8–10 minutes |

The catalog in `lib/assessments.ts` is the executable mapping. Seasonal details and norm availability change and must be rechecked before making claims in the UI.

## Scoring boundary

Pearson scores include raw counts/rates and, depending on the measure, vertical scale scores, nationally normed percentiles, composites, student growth percentiles, and configurable risk tiers. Some fluency scores apply validity or corrected-for-guessing rules. These conversions depend on secured items, grade, form, season, and norm set.

BrightPath reports only correct out of attempted, practice accuracy, self/adult-reported words read accurately, time spent, personal history, and trends within the same BrightPath activity. It never reports an official aimswebPlus score, percentile, composite, benchmark category, risk tier, or predicted official result.

## Content and trademark policy

Pearson's policies restrict copying test questions, passages, art, scales, directions, answer keys, and scoring algorithms. Contributors must create original prompts, distractors, passages, images, and audio. Public documentation may inform only the broad skill, task modality, and general time category.

The product name, logo, and visual system remain independent. The aimswebPlus name may appear only in factual explanatory text with the disclaimer that BrightPath is not affiliated with, endorsed by, or sponsored by Pearson.

## Primary sources

- [Pearson aimswebPlus Assessment Matrix (2025)](https://www.pearsonassessments.com/content/dam/school/global/clinical/us/assets/aimsweb/awp-assessment-matrix-us.pdf)
- [Pearson Early Literacy Administration and Scoring Guide](https://www.pearsonassessments.com/content/dam/school/global/clinical/us/assets/aimsweb/aimswebplus-early-literacy-administration-and-scoring-guide.pdf)
- [Pearson Reading Administration and Scoring Guide, Grades 2–8](https://www.pearsonassessments.com/content/dam/school/global/clinical/us/assets/aimsweb/aimswebplus-reading-administration-and-scoring-guide-grades-2-8.pdf)
- [Pearson technical manual](https://app.aimswebplus.com/help/fo_help/Content/Resources/PDF%27s/Guides%20and%20Manuals/aimswebPlus%20Technical%20Manual.pdf)
- [Pearson legal policies](https://www.pearsonassessments.com/footer/legal-policies.html)
- [Pearson terms of sale and use](https://www.pearsonassessments.com/footer/terms-of-sale---use.html)
