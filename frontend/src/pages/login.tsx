import UsersLogin from '../users/userslogin'
export default function Login(){
    return(
        <div className='bg-[var(--bg-color)] min-h-screen'>
            <div className='pt-5 flex justify-between'>
                <div>
                    <img src="/logo.png" alt="logo"/>
                </div>
                <div>
                    <p>No account? <span className='text-[var(--primary-color)]'>Sign up for free</span></p>
                </div>
            </div>
            <div>
                <UsersLogin/>
            </div>

        </div>
    )
}