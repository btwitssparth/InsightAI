from fastapi import APIRouter

router = APIRouter(prefix='/auth', tags=['Auth'])

@router.get('/me')
def get_me():
    return {'status':'auth-foundation'}
