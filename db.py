"""
Singleton Supabase client for CRT-ALGO Backend
Avoids creating multiple connections across executors
"""
from supabase import create_client
import os
from typing import Optional

_client: Optional[object] = None


def get_client():
    """
    Returns a singleton Supabase client.
    Uses SUPABASE_SERVICE_ROLE_KEY for backend operations.
    """
    global _client

    if _client is not None:
        return _client

    supabase_url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")

    if not supabase_url or not supabase_key:
        raise ValueError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables")

    _client = create_client(supabase_url, supabase_key)
    return _client


def get_supabase_url():
    """Get Supabase URL for frontend-compatible calls"""
    return os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")


def get_supabase_anon_key():
    """Get Supabase anon key for frontend"""
    return os.getenv("SUPABASE_ANON_KEY") or os.getenv("SUPABASE_KEY")