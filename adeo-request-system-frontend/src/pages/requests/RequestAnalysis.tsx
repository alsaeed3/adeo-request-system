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
    
    // Remove formatting artifacts
    let formattedText = text
      .replace(/[*]/g, '')  // Remove asterisks
      .replace(/^\s*\.\s*/gm, '')  // Remove dots at start of lines
      .replace(/^-\s+/gm, '') // Remove dash bullet points
      .replace(/^\d+\.\s*/gm, '') // Remove numbered list markers
      .trim();
  
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
            <h3 className={`text-lg font-semibold text-gray-900 ${textClass} mb-3`}>{title}</h3>
          )}
          <ul className="space-y-2">
            {content.map((item, index) => {
              const formattedItem = formatText(item, language);
              if (!formattedItem) return null;
              
              return (
                <li 
                  key={index}
                  className={`p-3 border-r-4 border-l-0 ${getBorderColor()} rounded-l-lg ${
                    language === 'ar' ? 'pr-4 border-r-4 border-l-0 rounded-l-lg' : 'pl-4 border-l-4 border-r-0 rounded-r-lg'
                  } ${textClass}`}
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
          <h3 className={`text-lg font-semibold text-gray-900 ${textClass} mb-3`}>{title}</h3>
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
  
  const translations = {
    en: {
      executiveSummary: 'Executive Summary',
      keyTrends: 'Key Trends',
      strategicRecommendations: 'Strategic Recommendations',
      implementationSteps: 'Implementation Steps',
      riskAssessment: 'Risk Assessment',
      riskLevel: 'Risk Level',
      identifiedRisks: 'Identified Risks',
      budgetImplications: 'Budget Implications'
    },
    ar: {
      executiveSummary: 'الملخص التنفيذي',
      keyTrends: 'الاتجاهات الرئيسية',
      strategicRecommendations: 'التوصيات الاستراتيجية',
      implementationSteps: 'خطوات التنفيذ',
      riskAssessment: 'تقييم المخاطر',
      riskLevel: 'مستوى المخاطر',
      identifiedRisks: 'المخاطر المحددة',
      budgetImplications: 'الآثار المالية'
    }
  };
  
  const RequestAnalysis: React.FC<RequestAnalysisProps> = ({ analysis }) => {
    if (!analysis?.analysis || !analysis?.recommendations) return null;
  
    // Determine language based on content
    const language = analysis.language || 
      (isArabicText(analysis.analysis.summary || analysis.analysis.trends[0]) ? 'ar' : 'en');
    
    const t = translations[language];
  
    const riskLevelText = language === 'ar' ? {
      high: 'مرتفع',
      medium: 'متوسط',
      low: 'منخفض'
    } : {
      high: 'HIGH',
      medium: 'MEDIUM',
      low: 'LOW'
    };
  
    return (
      <div dir={language === 'ar' ? 'rtl' : 'ltr'} className="space-y-8">
        {/* Executive Summary with Trends */}
        <div className="space-y-6">
          <h2 className={`text-xl font-bold text-gray-900 ${language === 'ar' ? 'font-arabic' : ''}`}>
            {t.executiveSummary}
          </h2>
          {analysis.analysis.summary && (
            <AnalysisSection 
              content={analysis.analysis.summary} 
              language={language}
            />
          )}
          <AnalysisSection 
            title={t.keyTrends}
            content={analysis.analysis.trends.filter(t => t?.trim())} 
            language={language}
          />
        </div>
  
        {/* Strategic Recommendations */}
        <div className="space-y-6">
          <h2 className={`text-xl font-bold text-gray-900 ${language === 'ar' ? 'font-arabic' : ''}`}>
            {t.strategicRecommendations}
          </h2>
          <AnalysisSection 
            content={analysis.recommendations.strategic.filter(r => r?.trim())} 
            language={language}
            variant="success"
          />
        </div>
  
        {/* Implementation Steps */}
        <div className="space-y-6">
          <h2 className={`text-xl font-bold text-gray-900 ${language === 'ar' ? 'font-arabic' : ''}`}>
            {t.implementationSteps}
          </h2>
          <AnalysisSection 
            content={analysis.recommendations.operational.filter(o => o?.trim())} 
            language={language}
            variant="success"
          />
        </div>
  
        {/* Risk Assessment */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className={`text-lg ${language === 'ar' ? 'font-arabic' : ''}`}>
              {t.riskAssessment}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className={`flex items-center ${language === 'ar' ? 'space-x-reverse' : 'space-x-2'}`}>
                <span className={`font-semibold ${language === 'ar' ? 'font-arabic ml-2' : 'mr-2'}`}>
                  {t.riskLevel}:
                </span>
                <Badge variant={
                  analysis.analysis.riskLevel === 'high' ? 'destructive' :
                  analysis.analysis.riskLevel === 'medium' ? 'warning' :
                  'success'
                }>
                  {riskLevelText[analysis.analysis.riskLevel.toLowerCase() as keyof typeof riskLevelText]}
                </Badge>
              </div>
              
              {analysis.recommendations.risks.length > 0 && (
                <AnalysisSection 
                  title={t.identifiedRisks}
                  content={analysis.recommendations.risks.filter(r => r?.trim())} 
                  language={language}
                  variant="warning"
                />
              )}
              
              {analysis.recommendations.budgetImplications && (
                <AnalysisSection 
                  title={t.budgetImplications}
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