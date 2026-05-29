import { Star } from "lucide-react"

const mockTrainers = [
  {
    id: "1",
    name: "Budi Santoso",
    specialization: "Hypertrophy & Strength",
    rating: 4.9,
    image: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=600&auto=format&fit=crop",
  },
  {
    id: "2",
    name: "Siti Rahma",
    specialization: "Weight Loss & Cardio",
    rating: 4.8,
    image: "https://images.unsplash.com/photo-1594381898411-846e7d193883?q=80&w=600&auto=format&fit=crop",
  },
  {
    id: "3",
    name: "Kevin Pratama",
    specialization: "CrossFit & Mobility",
    rating: 5.0,
    image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=600&auto=format&fit=crop",
  }
]

export function TrainersSection() {
  return (
    <section className="py-24 bg-zinc-50 dark:bg-zinc-950">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
          <div className="max-w-2xl">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Tim Personal Trainer Kami</h2>
            <p className="text-zinc-600 dark:text-zinc-400 text-lg">
              Dibimbing langsung oleh para profesional bersertifikasi yang berdedikasi penuh untuk transformasi Anda.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {mockTrainers.map((trainer) => (
            <div key={trainer.id} className="group relative overflow-hidden rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 transition-all hover:shadow-xl">
              <div className="aspect-[4/5] overflow-hidden">
                <img 
                  src={trainer.image} 
                  alt={trainer.name} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-6 pt-24 text-white">
                <div className="flex justify-between items-end">
                  <div>
                    <h3 className="text-2xl font-bold mb-1">{trainer.name}</h3>
                    <p className="text-zinc-300 text-sm font-medium">{trainer.specialization}</p>
                  </div>
                  <div className="flex items-center bg-white/20 backdrop-blur-sm px-2 py-1 rounded-lg">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 mr-1" />
                    <span className="font-bold text-sm">{trainer.rating}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
