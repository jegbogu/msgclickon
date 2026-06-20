export default function Managecontactsbanner(){
    return(
        <div className="bg-white mt-5 p-5 border border-gray-300 rounded-md text-sm">
             <p className="font-bold text-black">Import contacts</p>
             <div className="flex mt-5 gap-5">

                <div className="text-center  justify-items-center">
                <p className="bg-[var(--primary-color)] text-white w-5 h-5  rounded-full items-center justify-items-center text-sm font-bold">1</p>

                <p className="font-bold text-black ">Download template</p>
                <p>Get our CSV templates with the correct column hearders</p>
                <button type="button" className="border-gray-500 border rounded-md p-2">Download CSV template</button>
             </div>

                <div className="text-center  justify-items-center">
                <p className="bg-[var(--primary-color)] text-white w-5 h-5  rounded-full items-center justify-items-center text-sm font-bold">2</p>
                <p className="font-bold text-black ">Fill your contacts</p>
                <p>Fill names, emails, phone numbers and birthdays to the files</p>
                
             </div>

                <div className="text-center  justify-items-center">
                <p className="bg-[var(--primary-color)] text-white w-5 h-5  rounded-full items-center justify-items-center text-sm font-bold">3</p>
                <p className="font-bold text-black ">Upload your CSV</p>
                <p>We'll import all contacts instantly and check for duplicates</p>
                <button type="button" className="border-gray-500 border rounded-md p-2">Upload CSV file</button>
             </div>
             
             </div>
             <p className="mt-5 p-2 bg-[var(--bg-color)] rounded-md">
                <span className="font-bold text-black text-sm">CSV columns required: </span>
                first_name, last_name, email, phone, birthday (YYYY-MM-DD), group (Optional)
                </p>
             
        </div>
    )
}