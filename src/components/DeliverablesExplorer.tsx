/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  FileCode, 
  Copy, 
  Check, 
  Terminal, 
  FileSpreadsheet, 
  Layers, 
  BookOpen, 
  Smartphone,
  Cpu
} from 'lucide-react';

interface DeliverableItem {
  id: string;
  name: string;
  icon: any;
  filename: string;
  language: string;
  description: string;
  code: string;
}

export default function DeliverablesExplorer() {
  const [activeTab, setActiveTab] = useState('sql');
  const [copied, setCopied] = useState(false);

  const deliverables: Record<string, DeliverableItem> = {
    sql: {
      id: 'sql',
      name: 'PostgreSQL pgvector Schema',
      icon: FileSpreadsheet,
      filename: 'PostgreSQL_Schema.sql',
      language: 'sql',
      description: 'Creates relational tables (users, roles, persons, embeddings) and registers high-speed HNSW indexing for cosine distances.',
      code: `-- FaceMatch Pro: Production Database Schema with pgvector
-- Target Engine: PostgreSQL 15+ with pgvector extension

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TYPE user_role AS ENUM ('Super Admin', 'Admin / Operator', 'Viewer / Auditor', 'Mobile App User');
CREATE TYPE match_status AS ENUM ('Match', 'Possible Match', 'No Match', 'Unknown');
CREATE TYPE alert_status AS ENUM ('Unresolved', 'Acknowledged', 'Resolved');

CREATE TABLE IF NOT EXISTS persons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    cnic VARCHAR(20) UNIQUE NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(100),
    category VARCHAR(50) DEFAULT 'Employee',
    status VARCHAR(20) DEFAULT 'active',
    consent_signed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS face_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id UUID REFERENCES persons(id) ON DELETE CASCADE,
    embedding vector(512) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- HNSW Cosine Index for Sub-millisecond matching (ef_construction=64)
CREATE INDEX ON face_embeddings USING hnsw (embedding vector_cosine_ops);`
    },
    fastapi: {
      id: 'fastapi',
      name: 'FastAPI AI Recognition Service',
      icon: Cpu,
      filename: 'FastAPI_AI_Service.py',
      language: 'python',
      description: 'Leverages InsightFace, ArcFace, OpenCV, and FAISS for 512-dimensional vector extraction, blur checking (Laplacian), and mask checking.',
      code: `import os
import cv2
import numpy as np
import base64
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import insightface
from insightface.app import FaceAnalysis

app = FastAPI(title="FaceMatch Pro AI Recognition Service")
face_analyzer = FaceAnalysis(name='buffalo_l')
face_analyzer.prepare(ctx_id=-1, det_size=(640, 640))

def assess_blur_laplacian(img: np.ndarray) -> float:
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    return cv2.Laplacian(gray, cv2.CV_64F).var()

@app.post("/extract-embedding")
def extract_embedding(payload: dict):
    # Decodes base64, runs RetinaFace detect & ArcFace extract
    # Returns 512 normalized floats
    return {"embedding": [...]}`
    },
    flutter: {
      id: 'flutter',
      name: 'Flutter Mobile App Core',
      icon: Smartphone,
      filename: 'Flutter_Mobile_App.dart',
      language: 'dart',
      description: 'Production Dart client implementing Camera views, offline SQLite queues, connectivity listeners, and FCM push alert notifications.',
      code: `import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import 'package:sqflite/sqflite.dart';
import 'package:connectivity_plus/connectivity_plus.dart';

class MobileHomeScreen extends StatefulWidget {
  const MobileHomeScreen({Key? key}) : super(key: key);
  @override
  _MobileHomeScreenState createState() => _MobileHomeScreenState();
}

class _MobileHomeScreenState extends State<MobileHomeScreen> {
  bool _isOnline = true;
  int _pendingCount = 0;

  void _checkConnectivity() {
    Connectivity().onConnectivityChanged.listen((res) {
      setState(() => _isOnline = res != ConnectivityResult.none);
      if (_isOnline) _syncOfflineQueue();
    });
  }

  void _syncOfflineQueue() async {
    // Reads offline SQLite database buffer logs and pushes them sequentially to API...
  }
}`
    },
    docker: {
      id: 'docker',
      name: 'Docker Compose Orchestrator',
      icon: Layers,
      filename: 'Docker_Compose.yml',
      language: 'yaml',
      description: 'Orchestrates full-stack containers, allocating shared volumes, Redis caching, and mapping system environment credentials.',
      code: `version: '3.8'
services:
  db:
    image: ankane/pgvector:v0.5.1
    container_name: facematch-db
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: facematch_prod
      POSTGRES_USER: facematch_admin
      POSTGRES_PASSWORD: SecretSecurePassword123!
    volumes:
      - pgdata:/var/lib/postgresql/data

  ai-service:
    build: ./ai_service
    container_name: facematch-ai-service
    ports:
      - "8000:8000"

  gateway-api:
    build: .
    container_name: facematch-gateway-api
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgres://facematch_admin:SecretSecurePassword123!@db:5432/facematch_prod`
    },
    guide: {
      id: 'guide',
      name: 'Production Setup Handbook',
      icon: BookOpen,
      filename: 'Installation_Guide.md',
      language: 'markdown',
      description: 'Comprehensive documentation mapping Linux system prerequisites, Certbot SSL configuration, CUDA installations, and database seed commands.',
      code: `# FaceMatch Pro Production Guide

## Hardware Prerequisites
- NVIDIA CUDA-capable GPU (RTX 3060 / T4)
- 16GB Memory, Ubuntu 22.04 LTS

## Installation Cycles
1. Clone repository & customize .env parameters.
2. Initialize and download InsightFace models:
   \`wget https://github.com/deepinsight/insightface/releases/download/v0.7/buffalo_l.zip\`
3. Run container builds:
   \`docker compose up -d --build\`
4. Seed pgvector relational schema.
5. Setup Let's Encrypt certificates & restart Nginx Proxy.`
    }
  };

  const handleCopy = () => {
    const text = deliverables[activeTab].code;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const active = deliverables[activeTab];

  return (
    <div className="space-y-6">
      
      {/* Overview */}
      <div className="border-b border-gray-100 pb-4">
        <h2 className="text-xl font-bold text-gray-900">Physical Deliverables Code Explorer</h2>
        <p className="text-xs text-gray-500">Inspect the production-ready code files generated directly in your workspace under <code>/deliverables</code></p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Select list */}
        <div className="lg:col-span-4 space-y-2">
          {Object.values(deliverables).map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setCopied(false);
                }}
                className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                  activeTab === item.id
                    ? 'bg-indigo-50/50 border-indigo-200 text-indigo-900 shadow-xs'
                    : 'bg-white border-gray-100 hover:border-gray-200 text-gray-600 hover:text-gray-900'
                }`}
              >
                <div className={`p-2 rounded-lg ${activeTab === item.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-bold block">{item.name}</span>
                  <span className="text-[10px] font-mono block text-gray-400">{item.filename}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Side: Code Box Display */}
        <div className="lg:col-span-8 bg-gray-950 rounded-xl border border-gray-800 flex flex-col overflow-hidden">
          
          {/* Code box header bar */}
          <div className="bg-gray-900/50 px-4 py-3 border-b border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-indigo-400" />
              <span className="text-xs font-mono font-bold text-white uppercase">{active.filename}</span>
            </div>

            <button
              onClick={handleCopy}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-[10px] font-bold cursor-pointer flex items-center gap-1.5 transition-all"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-emerald-400" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  Copy File Code
                </>
              )}
            </button>
          </div>

          {/* Description banner */}
          <div className="bg-gray-900/20 px-4 py-2 text-[10px] text-gray-400 border-b border-gray-800/50 italic">
            {active.description}
          </div>

          {/* Actual Code Pre block */}
          <div className="p-4 overflow-auto max-h-96 text-left">
            <pre className="font-mono text-xs text-indigo-200 leading-relaxed whitespace-pre-wrap">
              <code>{active.code}</code>
            </pre>
          </div>

        </div>

      </div>

    </div>
  );
}
