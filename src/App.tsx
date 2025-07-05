import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Target, Zap, BrainCircuit } from 'lucide-react'
import { blink } from './blink/client'
import { Button } from './components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'
import { Input } from './components/ui/input'
import { Label } from './components/ui/label'
import { Textarea } from './components/ui/textarea'
import { Badge } from './components/ui/badge'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select'
import toast from 'react-hot-toast'

interface AdCreative {
  id: string
  type: 'copy' | 'visual' | 'campaign'
  title: string
  content: string
  industry: string
  tone: string
  platform: string
  created_at: string
  user_id?: string
}

function App() {
  const [user, setUser] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [creatives, setCreatives] = useState<AdCreative[]>([])
  const [formData, setFormData] = useState({
    industry: '',
    product: '',
    targetAudience: '',
    tone: '',
    platform: '',
    goals: '',
    constraints: ''
  })

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
      if (state.user) {
        loadCreatives(state.user)
      }
    })
    return unsubscribe
  }, [])

  const loadCreatives = async (currentUser = user) => {
    if (!currentUser?.id) {
      console.log('No user ID available, skipping load')
      return
    }
    
    try {
      console.log('Loading creatives for user:', currentUser.id)
      const savedCreatives = await blink.db.ad_creatives.list({
        where: { user_id: currentUser.id },
        orderBy: { created_at: 'desc' },
        limit: 50
      })
      console.log('Loaded creatives:', savedCreatives)
      
      // Ensure we always have an array
      if (Array.isArray(savedCreatives)) {
        setCreatives(savedCreatives)
      } else if (savedCreatives && typeof savedCreatives === 'object') {
        // If it's an object with data property
        const creativesArray = savedCreatives.data || savedCreatives
        setCreatives(Array.isArray(creativesArray) ? creativesArray : [])
      } else {
        setCreatives([])
      }
    } catch (error) {
      console.error('Error loading creatives:', error)
      setCreatives([]) // Set empty array on error
      toast.error('Failed to load your creatives')
    }
  }

  const generateAdCreative = async (type: 'copy' | 'visual' | 'campaign') => {
    if (!formData.industry || !formData.product || !formData.targetAudience) {
      toast.error('Please fill in the required fields: industry, product, and target audience')
      return
    }

    setIsGenerating(true)
    
    try {
      let prompt = ''
      let title = ''

      switch (type) {
        case 'copy':
          prompt = `Create compelling ad copy for a ${formData.product} in the ${formData.industry} industry. 
                   Target audience: ${formData.targetAudience}
                   Tone: ${formData.tone || 'professional'}
                   Platform: ${formData.platform || 'general'}
                   Goals: ${formData.goals || 'increase brand awareness and drive sales'}
                   ${formData.constraints ? `Constraints: ${formData.constraints}` : ''}
                   
                   Generate 3 different ad copy variations with headlines and body text. Make them compelling, action-oriented, and tailored to the platform and audience.`
          title = `Ad Copy for ${formData.product}`
          break
        
        case 'visual':
          prompt = `Create visual concept ideas for advertising a ${formData.product} in the ${formData.industry} industry.
                   Target audience: ${formData.targetAudience}
                   Tone: ${formData.tone || 'professional'}
                   Platform: ${formData.platform || 'general'}
                   
                   Describe 3 creative visual concepts including:
                   - Main visual elements and composition
                   - Color palette and mood
                   - Typography suggestions
                   - Layout and design approach
                   - Call-to-action placement
                   
                   Make the concepts innovative, eye-catching, and appropriate for the target audience.`
          title = `Visual Concepts for ${formData.product}`
          break
        
        case 'campaign':
          prompt = `Design a comprehensive marketing campaign for ${formData.product} in the ${formData.industry} industry.
                   Target audience: ${formData.targetAudience}
                   Goals: ${formData.goals || 'increase brand awareness and drive sales'}
                   
                   Create a detailed campaign strategy including:
                   - Campaign theme and messaging
                   - Multi-platform approach (social media, digital, traditional)
                   - Content calendar suggestions
                   - Key performance indicators (KPIs)
                   - Budget allocation recommendations
                   - Timeline and milestones
                   
                   Make it actionable and results-driven.`
          title = `Campaign Strategy for ${formData.product}`
          break
      }

      const { text } = await blink.ai.generateText({
        prompt,
        model: 'gpt-4o-mini',
        maxTokens: 1500
      })

      const newCreative: AdCreative = {
        id: Date.now().toString(),
        type,
        title,
        content: text,
        industry: formData.industry,
        tone: formData.tone || 'professional',
        platform: formData.platform || 'general',
        created_at: new Date().toISOString(),
        user_id: user?.id
      }

      // Save to database
      await blink.db.ad_creatives.create({
        ...newCreative,
        created_at: new Date().toISOString()
      })

      setCreatives(prev => [newCreative, ...prev])
      toast.success(`${type === 'copy' ? 'Ad Copy' : type === 'visual' ? 'Visual Concepts' : 'Campaign Strategy'} generated successfully!`)
    } catch (error) {
      console.error('Error generating creative:', error)
      toast.error('Failed to generate creative. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'copy': return <Sparkles className="h-4 w-4" />
      case 'visual': return <Target className="h-4 w-4" />
      case 'campaign': return <BrainCircuit className="h-4 w-4" />
      default: return <Zap className="h-4 w-4" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'copy': return 'bg-blue-100 text-blue-800'
      case 'visual': return 'bg-purple-100 text-purple-800'
      case 'campaign': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="mb-6">
            <BrainCircuit className="h-16 w-16 text-indigo-600 mx-auto mb-4" />
            <h1 className="text-4xl font-bold text-gray-900 mb-2">AI Ad Creative Generator</h1>
            <p className="text-xl text-gray-600">Authenticate to start creating amazing ad content</p>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <BrainCircuit className="h-8 w-8 text-indigo-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">AI Ad Creative Generator</h1>
                <p className="text-sm text-gray-600">Powered by advanced AI for marketing professionals</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="secondary" className="bg-indigo-100 text-indigo-800">
                {user?.email}
              </Badge>
              <Button variant="outline" onClick={() => blink.auth.logout()}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Generation Form */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="h-5 w-5 text-indigo-600" />
                  <span>Generate Creative</span>
                </CardTitle>
                <CardDescription>
                  Fill in the details to generate AI-powered ad content
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="industry">Industry *</Label>
                  <Input
                    id="industry"
                    placeholder="e.g., Technology, Fashion, Healthcare"
                    value={formData.industry}
                    onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="product">Product/Service *</Label>
                  <Input
                    id="product"
                    placeholder="e.g., Fitness App, Running Shoes, Consulting Service"
                    value={formData.product}
                    onChange={(e) => setFormData(prev => ({ ...prev, product: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="audience">Target Audience *</Label>
                  <Input
                    id="audience"
                    placeholder="e.g., Young professionals, Parents, Tech enthusiasts"
                    value={formData.targetAudience}
                    onChange={(e) => setFormData(prev => ({ ...prev, targetAudience: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="tone">Tone</Label>
                  <Select value={formData.tone} onValueChange={(value) => setFormData(prev => ({ ...prev, tone: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select tone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                      <SelectItem value="friendly">Friendly</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="luxurious">Luxurious</SelectItem>
                      <SelectItem value="playful">Playful</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="platform">Platform</Label>
                  <Select value={formData.platform} onValueChange={(value) => setFormData(prev => ({ ...prev, platform: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="linkedin">LinkedIn</SelectItem>
                      <SelectItem value="twitter">Twitter/X</SelectItem>
                      <SelectItem value="google">Google Ads</SelectItem>
                      <SelectItem value="print">Print Media</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="goals">Campaign Goals</Label>
                  <Textarea
                    id="goals"
                    placeholder="e.g., Increase brand awareness, drive sales, generate leads"
                    value={formData.goals}
                    onChange={(e) => setFormData(prev => ({ ...prev, goals: e.target.value }))}
                    rows={2}
                  />
                </div>

                <div>
                  <Label htmlFor="constraints">Constraints/Requirements</Label>
                  <Textarea
                    id="constraints"
                    placeholder="e.g., Budget limits, brand guidelines, legal requirements"
                    value={formData.constraints}
                    onChange={(e) => setFormData(prev => ({ ...prev, constraints: e.target.value }))}
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <Button
                    onClick={() => generateAdCreative('copy')}
                    disabled={isGenerating}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    {isGenerating ? 'Generating...' : 'Generate Ad Copy'}
                  </Button>
                  
                  <Button
                    onClick={() => generateAdCreative('visual')}
                    disabled={isGenerating}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Target className="h-4 w-4 mr-2" />
                    {isGenerating ? 'Generating...' : 'Generate Visual Concepts'}
                  </Button>
                  
                  <Button
                    onClick={() => generateAdCreative('campaign')}
                    disabled={isGenerating}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <BrainCircuit className="h-4 w-4 mr-2" />
                    {isGenerating ? 'Generating...' : 'Generate Campaign Strategy'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Generated Content */}
          <div className="lg:col-span-2">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Creative Library</h2>
              <p className="text-gray-600">AI-generated ad content tailored to your specifications</p>
            </div>

            {creatives.length === 0 ? (
              <Card className="p-12 text-center">
                <BrainCircuit className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No creatives yet</h3>
                <p className="text-gray-600 mb-6">Fill out the form and generate your first AI-powered ad creative!</p>
              </Card>
            ) : (
              <div className="space-y-6">
                {creatives.map((creative) => (
                  <motion.div
                    key={creative.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="flex items-center space-x-2 mb-2">
                              {getTypeIcon(creative.type)}
                              <span>{creative.title}</span>
                            </CardTitle>
                            <div className="flex flex-wrap gap-2">
                              <Badge className={getTypeColor(creative.type)}>
                                {creative.type.charAt(0).toUpperCase() + creative.type.slice(1)}
                              </Badge>
                              <Badge variant="outline">{creative.industry}</Badge>
                              <Badge variant="outline">{creative.tone}</Badge>
                              <Badge variant="outline">{creative.platform}</Badge>
                            </div>
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(creative.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="prose prose-sm max-w-none">
                          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                            {creative.content}
                          </pre>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App