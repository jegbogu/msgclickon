import UsersLogin from '../users/userslogin'
export default function Login(){
    return(
        <div className='bg-[var(--bg-color)] min-h-screen p-5'>
            <div className='pt-5 flex justify-between'>
                <div>
                    <img src="/logo2.png" alt="logo"/>
                </div>
                <div>
                    <p>No account? <span className='text-[var(--primary-color)]'><a href="/register">Sign up for free</a> </span></p>
                </div>
            </div>
            <div>
                <UsersLogin/>
            </div>

        </div>
    )
}