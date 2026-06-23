"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

/**
 * Rules page now anchors to the regulations section of the Profile page.
 */
export default function RulesRedirect() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to profile page with a focus on the rules section
    router.replace("/profile")
  }, [router])

  return null
}
