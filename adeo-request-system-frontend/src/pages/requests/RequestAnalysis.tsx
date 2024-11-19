import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card";
  import { Badge } from "@/components/ui/badge";
  
  const isArabicText = (text?: string): boolean => {
    if (!text) return false;
    const arabicPattern = /[\u0600-\u06FF]/;
    return arabicPattern.test(text);
  };
  
  const formatText = (text: string, language = 'en') => {
    if (!text) return '';
    
    // Remove asterisks and clean up formatting artifacts
    let formattedText = text
      .replace(/\*/g, '')  // Remove asterisks
      .replace(/^\s*\.\s*/gm, '')  // Remove dots at start of lines
      .replace(/^-\s+/gm, '') // Remove dash bullet points
      .replace(/^\d+\.\s*/gm, '') // Remove numbered list markers
      .trim();
  
    // Add specific formatting for Arabic text
    if (language === 'ar') {
      formattedText = formattedText
        .replace(/(\d+)/g, (match) => {
          // Convert Western numbers to Arabic numerals if needed
          const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
          return match.split('').map(d => arabicNumerals[parseInt(d)]).join('');
        });
    }
  
    return formattedText;
  };
  
  interface AnalysisSectionProps {
    title?: string;
    content: string | string[];
    language?: 'en' | 'ar';
    variant?: 'default' | 'success' | 'warning';
  }
  
  const AnalysisSection: React.FC<AnalysisSectionProps> = ({ 
    title, 
    content, 
    language = 'en',
    variant = 'default' 
  }) => {
    const containerClass = `space-y-2 ${language === 'ar' ? 'rtl' : 'ltr'}`;
    const textClass = `${language === 'ar' ? 'font-arabic' : ''} ${
      language === 'ar' ? 'text-right' : 'text-left'
    }`;
  
    const getBorderColor = () => {
      switch (variant) {
        case 'success':
          return 'border-green-500 bg-green-50/50';
        case 'warning':
          return 'border-yellow-500 bg-yellow-50/50';
        default:
          return 'border-blue-500 bg-blue-50/50';
      }
    };
  
    if (Array.isArray(content)) {
      return (
        <div className={containerClass}>
          {title && (
            <h3 className={`text-lg font-semibold text-gray-900 ${textClass}`}>{title}</h3>
          )}
          <ul className="space-y-2">
            {content.map((item, index) => {
              const formattedItem = formatText(item, language);
              if (!formattedItem) return null;
              
              return (
                <li 
                  key={index}
                  className={`pl-4 border-l-2 ${getBorderColor()} p-2 rounded-r-lg ${textClass}`}
                >
                  {formattedItem}
                </li>
              );
            })}
          </ul>
        </div>
      );
    }
  
    const formattedContent = formatText(content, language);
    if (!formattedContent) return null;
  
    return (
      <div className={containerClass}>
        {title && (
          <h3 className={`text-lg font-semibold text-gray-900 ${textClass}`}>{title}</h3>
        )}
        <p className={`text-gray-700 leading-relaxed ${textClass}`}>
          {formattedContent}
        </p>
      </div>
    );
  };
  
  interface RequestAnalysisProps {
    analysis: {
      analysis: {
        summary: string;
        trends: string[];
        riskLevel: string;
        impactAssessment?: string;
        policyAlignment?: string;
      };
      recommendations: {
        strategic: string[];
        operational: string[];
        timeline?: string;
        risks: string[];
        budgetImplications?: string;
      };
      language?: 'en' | 'ar';
    };
  }
  
  const RequestAnalysis: React.FC<RequestAnalysisProps> = ({ analysis }) => {
    if (!analysis?.analysis || !analysis?.recommendations) return null;
  
    // Determine language based on content or fallback to provided language
    const language = analysis.language || 
      (isArabicText(analysis.analysis.summary) ? 'ar' : 'en');
  
    const translations = {
      executiveSummary: language === 'ar' ? 'الملخص التنفيذي' : 'Executive Summary',
      keyTrends: language === 'ar' ? 'الاتجاهات الرئيسية' : 'Key Trends',
      strategicRecommendations: language === 'ar' ? 'التوصيات الاستراتيجية' : 'Strategic Recommendations',
      implementationSteps: language === 'ar' ? 'خطوات التنفيذ' : 'Implementation Steps',
      riskAssessment: language === 'ar' ? 'تقييم المخاطر' : 'Risk Assessment',
      riskLevel: language === 'ar' ? 'مستوى المخاطر' : 'Risk Level',
      identifiedRisks: language === 'ar' ? 'المخاطر المحددة' : 'Identified Risks',
      budgetImplications: language === 'ar' ? 'الآثار المالية' : 'Budget Implications'
    };
  
    return (
      <div className={`space-y-8 ${language === 'ar' ? 'rtl' : 'ltr'}`}>
        {/* Executive Summary with Trends */}
        <div className="space-y-6">
          <h2 className={`text-xl font-bold text-gray-900 ${language === 'ar' ? 'text-right font-arabic' : ''}`}>
            {translations.executiveSummary}
          </h2>
          {analysis.analysis.summary && (
            <AnalysisSection 
              content={analysis.analysis.summary} 
              language={language}
            />
          )}
          <AnalysisSection 
            title={translations.keyTrends}
            content={analysis.analysis.trends} 
            language={language}
          />
        </div>
  
        {/* Strategic Recommendations */}
        <div className="space-y-6">
          <h2 className={`text-xl font-bold text-gray-900 ${language === 'ar' ? 'text-right font-arabic' : ''}`}>
            {translations.strategicRecommendations}
          </h2>
          <AnalysisSection 
            content={analysis.recommendations.strategic} 
            language={language}
            variant="success"
          />
        </div>
  
        {/* Implementation Steps */}
        <div className="space-y-6">
          <h2 className={`text-xl font-bold text-gray-900 ${language === 'ar' ? 'text-right font-arabic' : ''}`}>
            {translations.implementationSteps}
          </h2>
          <AnalysisSection 
            content={analysis.recommendations.operational} 
            language={language}
            variant="success"
          />
        </div>
  
        {/* Risk Assessment */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className={`text-lg ${language === 'ar' ? 'text-right font-arabic' : ''}`}>
              {translations.riskAssessment}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className={`flex items-center ${language === 'ar' ? 'justify-end' : 'justify-start'} space-x-2`}>
                <Badge variant={
                  analysis.analysis.riskLevel === 'high' ? 'destructive' :
                  analysis.analysis.riskLevel === 'medium' ? 'warning' :
                  'success'
                }>
                  {analysis.analysis.riskLevel.toUpperCase()}
                </Badge>
                <span className={`font-semibold ${language === 'ar' ? 'font-arabic' : ''}`}>
                  {translations.riskLevel}
                </span>
              </div>
              {analysis.recommendations.risks.length > 0 && (
                <AnalysisSection 
                  title={translations.identifiedRisks}
                  content={analysis.recommendations.risks} 
                  language={language}
                  variant="warning"
                />
              )}
              {analysis.recommendations.budgetImplications && (
                <AnalysisSection 
                  title={translations.budgetImplications}
                  content={analysis.recommendations.budgetImplications} 
                  language={language}
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };
  
  export default RequestAnalysis;