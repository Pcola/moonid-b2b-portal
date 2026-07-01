-- PSČ k fakturačnej adrese firmy (kompletná adresa: address = ulica, zip = PSČ, city = mesto).
ALTER TABLE "Company" ADD COLUMN "zip" TEXT;
