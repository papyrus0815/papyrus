import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { LoginPage } from '@/pages/auth/login.page'
import { HomeFeedPage } from '@/pages/feed/home-feed.page'
import { ItemFeedPage } from '@/pages/feed/item-feed.page'
import { CreateCurationPage } from '@/pages/curation/create-curation.page'
import { CurationDetailPage } from '@/pages/curation/curation-detail.page'
import { UserRoomPage } from '@/pages/room/user-room.page'

export function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<HomeFeedPage />} />
        <Route path="/feed/:itemType/:itemId" element={<ItemFeedPage />} />
        <Route path="/curation/create" element={<CreateCurationPage />} />
        <Route path="/curation/:id" element={<CurationDetailPage />} />
        <Route path="/room/:id" element={<UserRoomPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

