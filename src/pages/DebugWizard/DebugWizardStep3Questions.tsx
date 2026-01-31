import React from 'react';
import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';

interface QuestionAnswer {
  id: string;
  answer: string;
  expected?: string;
  timestamp?: string;
}

interface DebugWizardStep3QuestionsProps {
  questionAnswers: QuestionAnswer[];
  onAnswerQuestion: (questionId: string, answer: string, expected: string) => void;
}

export const DebugWizardStep3Questions: React.FC<DebugWizardStep3QuestionsProps> = ({
  questionAnswers,
  onAnswerQuestion,
}) => {
  const { t } = useTranslation(['wizard', 'common']);

  // Define questions
  const questions = [
    {
      id: 'has_scale',
      text: t('questions.has_scale'),
      expected: 'Non',
    },
    {
      id: 'anything_special',
      text: t('questions.anything_special'),
      expected: 'Non',
    },
  ];

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        {t('questions.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t('questions.desc')}
      </Typography>

      <Stack spacing={2}>
        {questions.map((q) => {
          const currentAnswer = questionAnswers.find((qa) => qa.id === q.id);

          return (
            <Card key={q.id} variant="outlined">
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="flex-start" mb={2}>
                  <QuestionAnswerIcon color="action" />
                  <Typography variant="subtitle1" fontWeight="medium">
                    {q.text}
                  </Typography>
                </Stack>

                <Stack direction="row" spacing={1}>
                  <Button
                    variant={currentAnswer?.answer === 'Oui' ? 'contained' : 'outlined'}
                    onClick={() => onAnswerQuestion(q.id, 'Oui', q.expected)}
                    color={currentAnswer?.answer === 'Oui' ? 'primary' : 'inherit'}
                  >
                    {t('common:yes')}
                  </Button>
                  <Button
                    variant={currentAnswer?.answer === 'Non' ? 'contained' : 'outlined'}
                    onClick={() => onAnswerQuestion(q.id, 'Non', q.expected)}
                    color={currentAnswer?.answer === 'Non' ? 'primary' : 'inherit'}
                  >
                    {t('common:no')}
                  </Button>
                  <Button
                    variant={currentAnswer?.answer === 'Inconnu' ? 'contained' : 'outlined'}
                    onClick={() => onAnswerQuestion(q.id, 'Inconnu', q.expected)}
                    color={currentAnswer?.answer === 'Inconnu' ? 'secondary' : 'inherit'}
                  >
                    {t('common:unknown')}
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          );
        })}
      </Stack>
    </Box>
  );
};
