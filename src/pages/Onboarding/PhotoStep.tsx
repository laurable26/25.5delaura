import { useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'

interface PhotoStepProps {
  userId: string
  onNext: () => void
}

export function PhotoStep({ userId, onNext }: PhotoStepProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPreview(URL.createObjectURL(file))
  }

  async function handleUpload() {
    const file = inputRef.current?.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)

    const ext = file.name.split('.').pop()
    const path = `avatars/${userId}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      setError('Erreur upload: ' + uploadError.message)
      setUploading(false)
      return
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(path)

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ photo_url: data.publicUrl })
      .eq('id', userId)

    if (updateError) {
      setError('Erreur sauvegarde: ' + updateError.message)
    } else {
      onNext()
    }
    setUploading(false)
  }

  return (
    <div className="flex flex-col items-center gap-8 px-6 py-10">
      <div className="text-center">
        <h1 className="font-bangers text-purple-dark text-4xl tracking-wide">Bienvenue ! 🎉</h1>
        <p className="font-nunito text-purple-mid mt-2">Commence par prendre une photo pour ton profil</p>
      </div>

      {preview ? (
        <img src={preview} alt="Aperçu" className="w-40 h-40 rounded-full object-cover border-4 border-yellow-fest" />
      ) : (
        <div className="w-40 h-40 rounded-full bg-bg-main border-4 border-dashed border-border flex items-center justify-center">
          <span className="text-5xl">📷</span>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={handleFileChange}
      />

      <button
        onClick={() => inputRef.current?.click()}
        className="w-full max-w-xs py-3 rounded-btn border-2 border-purple-mid text-purple-dark font-nunito font-bold"
      >
        {preview ? '📷 Reprendre' : '📷 Prendre une photo'}
      </button>

      {error && <p className="text-pink-fluo font-nunito text-sm text-center">{error}</p>}

      {preview && (
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="w-full max-w-xs py-4 rounded-btn bg-pink-fluo text-white font-nunito font-bold text-lg disabled:opacity-60"
        >
          {uploading ? 'Envoi...' : 'Continuer →'}
        </button>
      )}
    </div>
  )
}
