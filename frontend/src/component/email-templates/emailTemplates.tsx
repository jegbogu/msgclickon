export type TemplateId =
  | "classic"
  | "vibrant"
  | "corporate"
  | "personal";

export type EmailTemplateContent = {
  id: TemplateId;
  title: string;
  subject: string;
  content: string;
};

export const emailTemplates: Record<
  TemplateId,
  EmailTemplateContent
> = {
  classic: {
    id: "classic",
    title: "Classic birthday",
    subject: "Happy birthday, {FirstName}! 🎂",
    content: `Happy birthday, {FirstName}! 🎂

We hope this message finds you surrounded by joy and celebration.

Today is your special day, and we at {Company} wanted to take a moment to let you know how much you’re appreciated.

Wishing you a year filled with success, happiness and all the things that makes you smile. Thank you for being part of our journey.

With warm regards,

The {Company} Team`,
  },

  vibrant: {
    id: "vibrant",
    title: "Fun & vibrant",
    subject: "IT’S YOUR BIRTHDAY!!! 🎊",
    content: `IT’S YOUR BIRTHDAY!!! 🎊

Hey {FirstName}! 🎂

Drop everything for a moment because today is ALL about YOU! 🎈❤️

From everyone here at {Company} — we’re sending you the biggest birthday love. May today be as amazing as you are! 🎉

Go celebrate and enjoy every single minute of your special day! 🎁✨

With all the birthday energy,

The {Company} Crew`,
  },

  corporate: {
    id: "corporate",
    title: "Corporate formal",
    subject: "Happy Birthday, {FirstName}",
    content: `Dear {FirstName},

On behalf of the entire team at {Company}, we would like to extend our sincerest birthday wishes to you on this special occasion.

Your continued partnership and trust mean a great deal to us. We hope this day brings you much joy, and we look forward to continuing to serve you in the year ahead.

With best regards,

{Company} Team`,
  },

  personal: {
    id: "personal",
    title: "Personal & warm",
    subject: "Happy Birthday, {FirstName}! 💜",
    content: `Hey {FirstName} 💜

Just wanted to take a moment on your birthday to say — you matter. Not just as a client or contact, but as a person. Today is about you, and you deserve every bit of happiness coming your way.

We don't say it enough, but we're really glad to have you in our world. Here's to you, today and always. 🥂

Happy birthday from all of us,

{Company} ❤️`,
  },
};