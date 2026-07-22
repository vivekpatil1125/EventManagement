using Microsoft.EntityFrameworkCore;
using EventManagement.Data;
using EventManagement.Interfaces;
using EventManagement.Services;

var builder = WebApplication.CreateBuilder(args);

// 1. Add DB Context Support for SQL Server
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// 2. Register custom identity business logic services
builder.Services.AddScoped<IAuthService, AuthService>();

// 3. Enable CORS for your React Frontend (Port 5173)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
    {
        policy.WithOrigins("http://localhost:5173") // Matches your Vite/React port
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// 4. Activate the CORS Policy (Must be placed before UseAuthorization)
app.UseCors("AllowReactApp");

app.UseAuthorization();

app.MapControllers();

app.Run();