export interface SubjectContent {
  id?: string;
  subjectId: string;
  title: string;
  tags: string[];
  type: 'file' | 'text';
  storagePath?: string;
  extractedText?: string;
  createdAt: any;
}
