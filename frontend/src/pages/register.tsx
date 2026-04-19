import UsersRegister from '../users/usersregister'
export default function Register(){
    return(
        <div className='bg-[var(--bg-color)] min-h-screen'>
            <div className='pt-5 flex justify-between'>
                <div>
                    <img src="/logo.png" alt="logo"/>
                </div>
                <div>
                    <p>Already have an account? <span className='text-[var(--primary-color)]'>Log in</span></p>
                </div>
            </div>
            <div>
                <UsersRegister/>
            </div>

        </div>
    )
}