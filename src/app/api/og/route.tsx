import { ImageResponse } from 'next/og';
import { profile } from '@/data/profile';
import { site } from '@/lib/site';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const hasName = searchParams.has('name');
    const name = hasName ? searchParams.get('name')?.slice(0, 50) : profile.name;
    const title = searchParams.get('title') || site.title;

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#16100c',
            backgroundImage: 'linear-gradient(135deg, rgba(224,90,71,0.15) 0%, rgba(22,16,12,1) 100%)',
            fontFamily: 'sans-serif',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px',
            }}
          >
            {/* We use an external image for the avatar to avoid complex buffer fetching in edge, or just text */}
            <div
              style={{
                fontSize: 120,
                fontWeight: 800,
                color: '#e05a47',
                letterSpacing: '-0.05em',
                lineHeight: 1,
              }}
            >
              Kotree
            </div>
          </div>
          
          <div
            style={{
              fontSize: 60,
              color: 'white',
              marginTop: 20,
              fontWeight: 600,
              textAlign: 'center',
              maxWidth: '80%',
            }}
          >
            {title}
          </div>
          
          <div
            style={{
              fontSize: 32,
              color: '#a1a1aa',
              marginTop: 20,
            }}
          >
            {name} &bull; {profile.role}
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: unknown) {
    console.log(`${(e as Error).message}`);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}
