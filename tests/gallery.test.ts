import { describe, expect, it } from "vitest";
import { handleOf, parseInstagramMedia } from "@/lib/instagram";

describe("galerie Instagram", () => {
  it("garde les photos, prend la miniature des vidéos, ignore le reste", () => {
    const photos = parseInstagramMedia({
      data: [
        { media_type: "IMAGE", media_url: "https://cdn.example/a.jpg", permalink: "https://www.instagram.com/p/A/", caption: "Look   Guadeloupean\nporté" },
        { media_type: "VIDEO", media_url: "https://cdn.example/v.mp4", thumbnail_url: "https://cdn.example/v.jpg", permalink: "https://www.instagram.com/reel/B/" },
        { media_type: "IMAGE", media_url: "http://insecure.example/c.jpg" }, // pas en https : ignorée
        { media_type: "VIDEO", media_url: "https://cdn.example/w.mp4" }, // vidéo sans miniature : ignorée
      ],
    });
    expect(photos.map((p) => p.src)).toEqual(["https://cdn.example/a.jpg", "https://cdn.example/v.jpg"]);
    expect(photos[0].alt).toBe("Look Guadeloupean porté");
    expect(photos[0].href).toBe("https://www.instagram.com/p/A/");
  });

  it("réponse invalide : liste vide, pas d'erreur", () => {
    expect(parseInstagramMedia(null)).toEqual([]);
    expect(parseInstagramMedia({ error: { message: "Invalid OAuth access token" } })).toEqual([]);
  });

  it("limite le nombre de tuiles", () => {
    const data = Array.from({ length: 20 }, (_, i) => ({ media_type: "IMAGE", media_url: `https://cdn.example/${i}.jpg` }));
    expect(parseInstagramMedia({ data }, 8)).toHaveLength(8);
  });

  it("nom d'utilisateur depuis l'adresse du profil", () => {
    expect(handleOf("https://www.instagram.com/2tijen/")).toBe("@2tijen");
    expect(handleOf("https://www.tiktok.com/@2tijen")).toBe("@2tijen");
  });
});
